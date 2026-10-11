# How-to guides

## Display a patch

Pass unified patch text to `Diff(patch=patch_text)`. For multi-file or multi-commit patches, `patch_file=0` selects the first file; subsequent indices follow patch order. Create one Diff per index to display several files.

A non-null patch takes precedence over `old_file` and `new_file`. Bind `patch` to null to return to file comparison. Invalid patches or indices produce a visible error and a `render-error` event.

Partial patches contain only their supplied context. Use complete old/new files when users need to expand omitted lines.

## Synchronize selection

Bind the selected range to a transports-hosted model and send user changes to an endpoint:

```python
from spaday import CallEndpoint, event_value
from spaday_diffs import Diff

comparison = (
    Diff(old_file=before, new_file=after)
    .bind("selected_lines", "selected_lines")
    .on(
        "selection-change",
        CallEndpoint("POST", "/api/review/selection", event_value()),
    )
)
```

The endpoint receives `{"range": {"start": 2, "end": 4, "side": "additions"}}`. Store that range in the hosted model. Set it to null to clear selection. Programmatic selection updates do not emit another event.

See `spaday_diffs/example.py` for the model, endpoint, WebSocket route, and autosync setup.

## Add review notes

```python
comparison = Diff(
    old_file=before,
    new_file=after,
    annotations=[
        {"side": "additions", "line": 3, "text": "Check this value."},
    ],
)
```

Lines are one-based. Line 0 adds a file-level note. Annotation text is rendered literally, not interpreted as HTML.

## Override colors

```python
comparison.css(
    spa_diffs_surface="#101827",
    spa_diffs_text="#e2e8f0",
    spa_diffs_added="#68d391",
    spa_diffs_deleted="#fc8181",
)
```

Set `theme_type="dark"` for dark syntax highlighting. Package tokens inherit from spaday shell tokens; direct overrides apply only to that viewer. Use `theme` to choose another Shiki syntax theme.

## Regenerate Python bindings

After editing the custom-elements manifest:

```bash
python -m spaday.cem spaday_diffs/components.cem.json -o spaday_diffs/components.py
python -m ruff format spaday_diffs/components.py
```

The tests compare generated bindings with the manifest.
