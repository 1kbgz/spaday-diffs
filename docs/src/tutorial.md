# Compare two files

Install the package:

```bash
pip install "spaday-diffs[examples]"
```

Create a Python file containing:

```python
import uvicorn
from spaday.backends.starlette import serve
from spaday_diffs import Diff, package

before = {"name": "settings.py", "contents": "retries = 1\n"}
after = {"name": "settings.py", "contents": "retries = 3\n"}

comparison = Diff(old_file=before, new_file=after, diff_style="split")
app = serve(comparison, packages=[package])
uvicorn.run(app, host="127.0.0.1", port=8000)
```

Run the file. Open http://127.0.0.1:8000. The deleted value appears on the left and the added value on the right.

Change `diff_style` to `"unified"` and run it again. Both versions now appear in one column.

The component definition is unchanged when used with spaday’s notebook backend.

For a working reactive application, run `python -m spaday_diffs.example` after installing `spaday-diffs[examples]`. Select a line number. The status beneath the comparison reports the selection received by Python.
