import {
  FileDiff,
  parsePatchFiles,
  type FileContents,
  type FileDiffMetadata,
  type FileDiffOptions,
  type SelectedLineRange,
} from "@pierre/diffs";

export interface Annotation {
  side: "additions" | "deletions";
  line: number;
  text: string;
}

/** Serializable, read-only adapter for Pierre's FileDiff. */
export class SpadayDiff extends HTMLElement {
  #viewer: FileDiff<string> | null = null;
  #old: FileContents | null = { name: "file.txt", contents: "" };
  #new: FileContents | null = { name: "file.txt", contents: "" };
  #patch: string | null = null;
  #patchFile = 0;
  #parsed: FileDiffMetadata[] | null = null;
  #selection: SelectedLineRange | null = null;
  #annotations: Annotation[] = [];
  #queued = false;
  #optionsDirty = true;
  #options: FileDiffOptions<string, undefined> = {
    diffStyle: "split",
    themeType: "system",
    overflow: "scroll",
    enableLineSelection: true,
    preferredHighlighter: "shiki-js",
    disableErrorHandling: true,
    onLineSelected: (range) => {
      this.#selection = range;
      this.#emit("selection-change", { range });
    },
    onLineClick: ({ lineNumber, annotationSide }) =>
      this.#emit("line-click", { line: lineNumber, side: annotationSide }),
    renderAnnotation: ({ metadata }) => {
      const note = document.createElement("div");
      note.className = "spaday-diff-annotation";
      note.textContent = metadata;
      return note;
    },
  };

  connectedCallback(): void {
    this.#schedule();
  }
  disconnectedCallback(): void {
    this.#viewer?.cleanUp();
    this.#viewer = null;
  }

  set old_file(value: FileContents | null) {
    this.#old = value;
    this.#schedule();
  }
  get old_file(): FileContents | null {
    return this.#old;
  }
  set new_file(value: FileContents | null) {
    this.#new = value;
    this.#schedule();
  }
  get new_file(): FileContents | null {
    return this.#new;
  }
  set patch(value: string | null) {
    if (value === this.#patch) return;
    this.#patch = value;
    this.#parsed = null;
    this.#schedule();
  }
  get patch(): string | null {
    return this.#patch;
  }
  set patch_file(value: number) {
    this.#patchFile = value;
    this.#schedule();
  }
  get patch_file(): number {
    return this.#patchFile;
  }
  set selected_lines(value: SelectedLineRange | null) {
    this.#selection = value;
    this.#viewer?.setSelectedLines(value, { notify: false });
  }
  get selected_lines(): SelectedLineRange | null {
    return this.#selection;
  }
  set annotations(value: Annotation[]) {
    this.#annotations = value ?? [];
    this.#schedule();
  }
  get annotations(): Annotation[] {
    return this.#annotations;
  }

  set diff_style(value: "split" | "unified") {
    this.#options.diffStyle = value;
    this.#schedule(true);
  }
  get diff_style() {
    return this.#options.diffStyle ?? "split";
  }
  set theme(value: FileDiffOptions<string, undefined>["theme"]) {
    this.#options.theme = value;
    this.#schedule(true);
  }
  get theme() {
    return this.#options.theme;
  }
  set theme_type(value: "light" | "dark" | "system") {
    this.#options.themeType = value;
    this.#schedule(true);
  }
  get theme_type() {
    return this.#options.themeType ?? "system";
  }
  set overflow(value: "scroll" | "wrap") {
    this.#options.overflow = value;
    this.#schedule(true);
  }
  get overflow() {
    return this.#options.overflow ?? "scroll";
  }
  set line_numbers(value: boolean) {
    this.#options.disableLineNumbers = !value;
    this.#schedule(true);
  }
  get line_numbers() {
    return !this.#options.disableLineNumbers;
  }
  set header(value: boolean) {
    this.#options.disableFileHeader = !value;
    this.#schedule(true);
  }
  get header() {
    return !this.#options.disableFileHeader;
  }
  set indicators(value: "classic" | "bars" | "none") {
    this.#options.diffIndicators = value;
    this.#schedule(true);
  }
  get indicators() {
    return this.#options.diffIndicators ?? "bars";
  }
  set line_diff(value: "word-alt" | "word-line" | "word" | "char" | "none") {
    this.#options.lineDiffType = value;
    this.#schedule(true);
  }
  get line_diff() {
    return this.#options.lineDiffType ?? "word-alt";
  }
  set expand_unchanged(value: boolean) {
    this.#options.expandUnchanged = value;
    this.#schedule(true);
  }
  get expand_unchanged() {
    return this.#options.expandUnchanged ?? false;
  }
  set collapsed(value: boolean) {
    this.#options.collapsed = value;
    this.#schedule(true);
  }
  get collapsed() {
    return this.#options.collapsed ?? false;
  }
  set selectable(value: boolean) {
    this.#options.enableLineSelection = value;
    this.#schedule(true);
  }
  get selectable() {
    return this.#options.enableLineSelection ?? true;
  }

  #emit(name: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  #schedule(optionsChanged = false): void {
    this.#optionsDirty ||= optionsChanged;
    if (this.#queued || !this.isConnected) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) this.#render();
    });
  }

  #render(): void {
    try {
      let source;
      if (this.#patch !== null) {
        this.#parsed ??= parsePatchFiles(this.#patch, undefined, true).flatMap(
          (patch) => patch.files,
        );
        const fileDiff = this.#parsed[this.#patchFile];
        if (!Number.isInteger(this.#patchFile) || !fileDiff)
          throw new Error("patch_file must select a file in the patch");
        source = { fileDiff };
      } else if (this.#old !== null) {
        source = { oldFile: this.#old, newFile: this.#new };
      } else if (this.#new !== null) {
        source = { oldFile: null, newFile: this.#new };
      } else {
        throw new Error("old_file and new_file cannot both be null");
      }
      if (!this.#viewer) {
        this.replaceChildren();
        this.#viewer = new FileDiff<string>({ ...this.#options });
      }
      this.#viewer.setOptions({ ...this.#options });
      this.#viewer.render({
        ...source,
        containerWrapper: this,
        forceRender: this.#optionsDirty,
        lineAnnotations: this.#annotations.map(({ side, line, text }) => ({
          side,
          lineNumber: line,
          metadata: text,
        })),
      });
      this.#viewer.setSelectedLines(this.#selection, { notify: false });
      this.#optionsDirty = false;
    } catch (error) {
      this.#viewer?.cleanUp();
      this.#viewer = null;
      const message = error instanceof Error ? error.message : String(error);
      const alert = document.createElement("p");
      alert.setAttribute("role", "alert");
      alert.textContent = message;
      this.replaceChildren(alert);
      this.#emit("render-error", { message });
    }
  }
}

if (!customElements.get("spaday-diff"))
  customElements.define("spaday-diff", SpadayDiff);
