# Reference

`Diff` is an alias for generated `SpadayDiff`. Both render `<spaday-diff>`.
`package` registers the `diffs` component package, CSS, JavaScript, and served upstream version.

## Properties

| Property           | Description                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `old_file`         | Original {name, contents, lang?} file. Null represents an added file.                                                                                        |
| `new_file`         | Updated {name, contents, lang?} file. Null represents a deleted file.                                                                                        |
| `patch`            | Unified patch text. When non-null, takes precedence over old_file and new_file.                                                                              |
| `patch_file`       | Zero-based file index across all commits in a patch. Defaults to 0.                                                                                          |
| `selected_lines`   | Selection {start, end, side?, endSide?}, using one-based lines and additions/deletions sides; null clears. Programmatic writes do not emit selection-change. |
| `annotations`      | Plain-text annotations [{side, line, text}], using one-based lines or 0 for a file-level note.                                                               |
| `diff_style`       | Diff layout; split by default.                                                                                                                               |
| `theme`            | Shiki theme name or {light, dark} theme names. Defaults to Pierre's themes.                                                                                  |
| `theme_type`       | Color mode; system by default.                                                                                                                               |
| `overflow`         | Code overflow; scroll by default.                                                                                                                            |
| `line_numbers`     | Show line numbers; true by default.                                                                                                                          |
| `header`           | Show the filename header; true by default.                                                                                                                   |
| `indicators`       | Change markers; bars by default.                                                                                                                             |
| `line_diff`        | Inline highlighting granularity; word-alt by default.                                                                                                        |
| `expand_unchanged` | Expand unchanged context when full file contents are available; false by default.                                                                            |
| `collapsed`        | Collapse code beneath the filename header; false by default.                                                                                                 |
| `selectable`       | Enable line selection by click and drag; true by default.                                                                                                    |

File objects contain `name` and `contents`, with optional `lang`. Bindings may supply null for one side to represent an added or deleted file. With direct Python construction, use an empty file on the missing side: constructor null values are omitted by spaday.

## Events

| Event              | Detail                                                       |
| ------------------ | ------------------------------------------------------------ |
| `selection-change` | `{range: {start, end, side?, endSide?}}`, or `{range: null}` |
| `line-click`       | `{line, side}`                                               |
| `render-error`     | `{message}`                                                  |

Line numbers are one-based. Sides are `"additions"` or `"deletions"`.
Events bubble across shadow boundaries. Only user selection changes emit `selection-change`.

## Styling tokens

`TOKENS` maps Python `css()` keyword names to spaday `Token` objects.

| Keyword                 | Controls                     | Shell fallback  |
| ----------------------- | ---------------------------- | --------------- |
| `spa_diffs_surface`     | viewer background            | `--spa-surface` |
| `spa_diffs_text`        | default text and filenames   | `--spa-text`    |
| `spa_diffs_muted`       | line numbers                 | `--spa-muted`   |
| `spa_diffs_added`       | added lines                  | `--spa-success` |
| `spa_diffs_deleted`     | deleted lines                | `--spa-danger`  |
| `spa_diffs_accent`      | selection and modified files | `--spa-accent`  |
| `spa_diffs_font_size`   | code font size               | None            |
| `spa_diffs_line_height` | code line height             | None            |

CSS spellings use hyphens, for example `--spa-diffs-surface`.
Tokens control viewer chrome and diff colors; syntax colors come from the selected Shiki theme.

## Runtime requirements

Python 3.11+, spaday 0.12+, and a modern browser with CSS `light-dark()` support.
The wheel includes Pierre Diffs 1.5.2 and its browser assets. The example additionally uses transports, Pydantic, Starlette, and Uvicorn.
