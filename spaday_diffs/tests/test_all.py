import ast
import re
from pathlib import Path

from spaday import generate
from spaday.bootstrap import bootstrap

from spaday_diffs import TOKENS, Diff, SpadayDiff, package

ROOT = Path(__file__).parents[1]


def test_files_and_options_serialize():
    node = Diff(
        old_file={"name": "app.py", "contents": "old"},
        new_file={"name": "app.py", "contents": "new"},
        diff_style="unified",
        line_numbers=False,
        annotations=[{"side": "additions", "line": 1, "text": "<b>Review</b>"}],
    ).to_node()
    assert Diff is SpadayDiff
    assert node["tag"] == "spaday-diff"
    assert node["props"]["old_file"]["Map"]["contents"] == {"Str": "old"}
    assert node["props"]["diff_style"] == {"Str": "unified"}
    assert node["props"]["line_numbers"] == {"Bool": False}
    assert node["props"]["annotations"]["List"][0]["Map"]["text"] == {"Str": "<b>Review</b>"}


def test_patch_and_selection_serialize():
    node = Diff(patch="patch text", patch_file=1, selected_lines={"start": 1, "end": 2, "side": "additions"}).to_node()
    assert node["props"]["patch"] == {"Str": "patch text"}
    assert node["props"]["patch_file"] == {"Int": 1}
    assert node["props"]["selected_lines"]["Map"]["side"] == {"Str": "additions"}


def test_package_assets_and_catalog():
    assert package.name == "diffs"
    assert [(schema.tag, schema.class_name) for schema in package.catalog] == [("spaday-diff", "SpadayDiff")]
    html = bootstrap(packages=[package])
    assert 'src="/components/diffs/cdn/index.js"' in html
    assert 'href="/components/diffs/css/index.css"' in html
    assert list((ROOT / "extension/cdn/chunks").glob("*.js"))


def test_generated_component_is_current():
    fresh = generate(str(ROOT / "components.cem.json"))
    assert ast.dump(ast.parse(fresh)) == ast.dump(ast.parse((ROOT / "components.py").read_text()))


def test_tokens_match_stylesheet():
    css = re.sub(r"\s+", "", (ROOT.parent / "js/src/css/index.css").read_text())
    assert set(re.findall(r"var\((--spa-diffs-[a-z0-9-]+)[,)]", css)) == {token.property for token in TOKENS.values()}
    assert not re.findall(r"(?<![-\w])(--spa-diffs-[a-z0-9-]+):", css)
    for token in TOKENS.values():
        if token.fallback:
            assert f"var({token.property},var({token.fallback}," in css
