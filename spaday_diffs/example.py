import asyncio
from typing import Literal

import transports
import uvicorn
from pydantic import BaseModel, Field
from spaday import CallEndpoint, element, event_value
from spaday.backends.starlette import serve
from starlette.responses import JSONResponse
from starlette.routing import Route, WebSocketRoute

from spaday_diffs import Diff, package

OLD = {"name": "pricing.py", "contents": "def total(items):\n    return sum(item.price for item in items)\n"}
PATCH = """diff --git a/settings.json b/settings.json
--- a/settings.json
+++ b/settings.json
@@ -1,3 +1,3 @@
 {
-  "retries": 1
+  "retries": 3
 }
"""


def revision_file(revision: int) -> dict[str, str]:
    return {
        "name": "pricing.py",
        "contents": f"def total(items, discount=0):\n    subtotal = sum(item.price for item in items)\n    return round(subtotal * (1 - discount), {revision % 3 + 2})\n",
    }


class Selection(BaseModel):
    start: int
    end: int
    side: Literal["additions", "deletions"] | None = None
    endSide: Literal["additions", "deletions"] | None = None


class ReviewFeed(BaseModel):
    new_file: dict[str, str] = Field(default_factory=lambda: revision_file(0))
    selected_lines: dict[str, int | str] | None = None
    diff_style: Literal["split", "unified"] = "split"
    overflow: Literal["scroll", "wrap"] = "scroll"
    revision: int = 0
    sync_status: str = "Select line numbers to send a selection to Python."
    annotations: list[dict[str, str | int]] = Field(
        default_factory=lambda: [{"side": "additions", "line": 3, "text": "Review rounding before merging."}]
    )


feed = ReviewFeed()
session = transports.Session()
session.host(feed)
server = transports.Server(session)


def advance_revision() -> None:
    feed.revision += 1
    feed.new_file = revision_file(feed.revision)


async def update_server_file() -> None:
    while True:
        await asyncio.sleep(10)
        advance_revision()


async def diff_event(request):
    event_type = request.path_params["event_type"]
    payload = await request.json()
    if event_type == "selection":
        value = payload.get("range")
        selection = Selection.model_validate(value) if value is not None else None
        feed.selected_lines = selection.model_dump(exclude_none=True) if selection else None
        feed.sync_status = (
            f"Python received lines {selection.start}–{selection.end} ({selection.side})." if selection else "Selection cleared in Python."
        )
    elif event_type == "revision":
        advance_revision()
        feed.sync_status = "Python updated the proposed file."
    elif event_type == "layout":
        feed.diff_style = "unified" if feed.diff_style == "split" else "split"
        feed.sync_status = f"Python set {feed.diff_style} layout."
    elif event_type == "wrap":
        feed.overflow = "wrap" if feed.overflow == "scroll" else "scroll"
        feed.sync_status = f"Python set {feed.overflow} overflow."
    elif event_type == "clear":
        feed.selected_lines = None
        feed.sync_status = "Selection cleared in Python."
    else:
        return JSONResponse({"message": "Unknown diff event"}, status_code=404)
    return JSONResponse({"message": feed.sync_status})


def control(label: str, action: str):
    return element("button", type="button").text(label).on("click", CallEndpoint("POST", f"/api/diff/{action}", {}))


viewer = (
    Diff(old_file=OLD, new_file=revision_file(0), theme_type="light", id="review-diff")
    .bind("new_file", "new_file")
    .bind("selected_lines", "selected_lines")
    .bind("annotations", "annotations")
    .bind("diff_style", "diff_style")
    .bind("overflow", "overflow")
    .on("selection-change", CallEndpoint("POST", "/api/diff/selection", event_value()))
)

page = element(
    "main",
    element(
        "header",
        element("p", class_="eyebrow").text("SPADAY DIFFS"),
        element("h1").text("Review a change"),
        element("p", class_="lede").text(
            "Compare files, select lines, and display review notes. Changes and selections round-trip through Python and transports."
        ),
        element(
            "nav", element("a", href="#gallery").text("Component gallery"), element("a", href="https://github.com/1kbgz/spaday-diffs").text("Source")
        ),
    ),
    element(
        "section",
        element(
            "div",
            element("div", element("h2").text("File comparison"), element("p").text("Python updates the proposed file every 10 seconds.")),
            element("div", element("span").text("Revision "), element("strong", id="revision").bind("textContent", "revision"), class_="revision"),
            class_="section-heading",
        ),
        element(
            "div",
            control("Next revision", "revision"),
            control("Toggle layout", "layout"),
            control("Toggle wrapping", "wrap"),
            control("Clear selection", "clear"),
            class_="controls",
        ),
        viewer,
        element("p", id="sync-status", role="status").bind("textContent", "sync_status"),
        class_="panel",
    ),
    element(
        "section",
        element("h2").text("Component gallery"),
        element("p").text("Each viewer below is a Python Diff component rendered by Pierre Diffs."),
        element("h3").text("Unified patch"),
        Diff(patch=PATCH, diff_style="unified", theme_type="light", id="patch-diff"),
        element("h3").text("Dark theme and annotations"),
        Diff(
            old_file=OLD,
            new_file=revision_file(0),
            theme_type="dark",
            annotations=[{"side": "additions", "line": 1, "text": "The new parameter defaults to zero."}],
            id="dark-diff",
        ).css(
            spa_diffs_surface="#151b26",
            spa_diffs_text="#e6edf7",
            spa_diffs_muted="#a2b2ca",
            spa_diffs_added="#78dda1",
            spa_diffs_deleted="#ff9b9b",
            spa_diffs_accent="#8cb4ff",
        ),
        element("h3").text("Wrapped lines without a file header"),
        Diff(
            old_file={"name": "README.md", "contents": "A short description.\n"},
            new_file={
                "name": "README.md",
                "contents": "A longer description explaining how file comparisons, server-backed line selections, and review annotations fit into a Python application.\n",
            },
            diff_style="unified",
            overflow="wrap",
            header=False,
            line_numbers=False,
            indicators="classic",
            line_diff="word",
            theme_type="light",
            id="wrapped-diff",
        ),
        element("h3").text("Collapsed file"),
        Diff(old_file=OLD, new_file=revision_file(0), collapsed=True, theme_type="light", id="collapsed-diff"),
        id="gallery",
        class_="panel",
    ),
    class_="workspace",
)

styles = """
<style>
:root { color-scheme: light; font: 15px/1.6 system-ui, sans-serif; color: #26334a; background: #f3f5f9; }
* { box-sizing: border-box; }
body { margin: 0; }
.workspace { max-width: 1180px; margin: auto; padding: 48px 24px 72px; }
header { margin-bottom: 32px; }
.eyebrow { font-size: 12px; font-weight: 750; letter-spacing: .14em; color: #315fd3; }
h1 { font-size: clamp(30px, 5vw, 44px); line-height: 1.2; letter-spacing: -.03em; margin: 10px 0; }
h2 { font-size: 20px; margin: 0; }
h3 { margin: 32px 0 12px; font-size: 16px; }
p { margin: 8px 0; }
.lede { color: #596780; max-width: 740px; }
nav { display: flex; gap: 24px; margin-top: 18px; }
a { color: #315fd3; text-underline-offset: 4px; }
.panel { background: #fff; border: 1px solid #dce2ec; border-radius: 16px; padding: 24px; margin-bottom: 28px; min-width: 0; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.section-heading p, #sync-status { color: #596780; font-size: 14px; }
.revision { border: 1px solid #dce2ec; padding: 6px 12px; border-radius: 8px; white-space: nowrap; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
button { border: 1px solid #cbd5e1; border-radius: 7px; padding: 9px 13px; background: #fff; color: #26334a; font: inherit; cursor: pointer; }
button:hover { background: #edf2ff; }
button:focus-visible, a:focus-visible { outline: 2px solid #315fd3; outline-offset: 3px; }
spaday-diff { border: 1px solid #dce2ec; border-radius: 8px; overflow: hidden; }
#sync-status { padding-top: 10px; min-height: 36px; }
@media (max-width: 600px) { .workspace { padding: 24px 12px; } .panel { padding: 16px; } .section-heading { align-items: flex-start; } }
</style>
"""

app = serve(
    page,
    packages=[package],
    wire="transports",
    routes=[WebSocketRoute("/ws", transports.ws_endpoint(server)), Route("/api/diff/{event_type}", diff_event, methods=["POST"])],
    background=[transports.autosync(server), update_server_file()],
    title="spaday-diffs · Review a change",
    head=styles,
)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8017)
