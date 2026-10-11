# Rendering and state

The Python component serializes spaday properties. A browser custom element passes those values to Pierre's imperative `FileDiff` renderer. This adapter does not recreate a diff viewer in Python or imitate its output with static HTML.

The custom-elements manifest defines Python properties, enum choices, and events. Generated bindings use spaday's normal actions and bindings. Integration code stays in this peer package; no core spaday changes are required.

## Updates and lifecycle

Property changes are batched within a microtask. The adapter retains the same upstream viewer between updates, allowing Pierre to maintain its DOM and scroll state. Programmatic selections use the upstream non-notifying API, preventing selection events from feeding back into the server.

Disconnecting cleans up the upstream instance. Reconnecting renders a new instance from the retained properties.

Patch parsing is cached until the patch text changes. A file index chooses one diff from a multi-file patch. Full-file comparisons can expand unchanged context; partial patches cannot supply lines absent from their input.

## Python and transports

The example hosts a Pydantic model in transports. Browser actions call Python endpoints; transports publishes changes back to spaday bindings. A background Python task updates the proposed file independently.

The Pyodide preview runs that same Python module in a browser worker. Its endpoint bridge and transports frames stay inside the browser. It does not substitute a separate JavaScript demo for the Python application.

## Assets and scope

The wheel contains the browser entry point and lazy syntax/theme chunks. Those chunks are served alongside the component, without external syntax-asset requests. The Pyodide preview downloads its Python runtime and dependencies separately.

Annotations accept plain text, not arbitrary HTML. Editing, merge-conflict resolution, custom JavaScript render callbacks, SSR, and worker-pool configuration are outside this initial wrapper.
