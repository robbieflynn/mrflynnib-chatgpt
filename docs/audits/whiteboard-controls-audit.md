# Whiteboard controls audit — 12 November 2026

## Finding

The current board mixes drawing, drawing settings, paper, navigation and window layout in a large wrapping header. Pen users see four widths, six colours, paper choices, page controls and zoom at the same time as core tools. Narrowing the board makes that header taller and reduces writing space. The issue is hierarchy and simultaneous choices, rather than too many useful capabilities.

The requested layout repair groups Expand/Collapse with Position, restores a draggable and keyboard-accessible divider in expanded Side view, and honours Below in expanded view. It keeps the header scrollable on small views so drawing space and all controls remain available. The wider changes below are proposals, not implemented.

## Reference patterns

- Apple Notes: tap the selected drawing tool again to change thickness and opacity. Keep the tool available; disclose its settings when needed. [Apple documentation](https://support.apple.com/en-ie/108919).
- Goodnotes: users can hide and reorder toolbar tools; hidden tools remain in overflow. It also separates Writing Tools and supports hiding the active tool menu. Borrow the uncluttered default, without adding a complicated toolbar-customisation screen. [Goodnotes documentation](https://support.goodnotes.com/hc/en-us/articles/8900755183631-Customize-the-toolbar).
- tldraw: separates toolbars, menus and style panels; components can be selectively hidden. Borrow the separation of drawing tools from appearance and view controls, without adopting its SDK. [tldraw documentation](https://tldraw.dev/docs/user-interface).

This comparison uses current official documentation and a source review of our shared whiteboard, not a hands-on hardware comparison of the three apps.

## Recommended simple default

1. View row: Position, Side, Below, Expand/Collapse. Keep close reachable here, plus saved status and active question part.
2. Drawing row: Pen, Eraser, Select, Highlighter, Undo. Keep labels alongside recognisable icons. Preserve Select for both handwriting and copied question images.
3. Tap an already selected tool to open its settings: pen width and colour; highlighter width and colour; eraser type and size. Keep selected settings across tool switches and show a small current-colour/width indicator. Whole-stroke erasing remains the initial default.
4. More menu: paper style, Add below, Add right, Pan and Clear. Keep Pan available for mouse and accessibility users; do not make navigation depend on undiscoverable gestures. Keep Clear visibly distinct from ordinary settings and preserve undo.
5. Copy question: keep a clear action near the question, so it reads as a question action rather than another drawing tool. Preserve diagram import.
6. Compact zoom controls outside the drawing palette, consistently placed. Keep multipart navigation and save state visible.

Avoid adding a second “simple/advanced” mode or student toolbar customisation initially: both create more settings to understand.

## Preserve and verify

Do not lose remembered tool settings, independently erasable cut fragments, large-scribble erasure, sharp viewport rendering, hold-to-straighten, image/ink selection, undo, zoom, paper expansion, saved work or multipart isolation. Teacher and submitted-student review must retain view controls without enabling editing.

Before publishing a wider redesign, review a preview at laptop, portrait tablet and landscape tablet sizes. Test actual Apple Pencil/palm behaviour separately from browser automation. Measure whether a student can write, erase, undo, move a copied question and change question/board proportions without instruction. No replacement engine, licence purchase or broader toolbar redesign is included in the layout repair.
