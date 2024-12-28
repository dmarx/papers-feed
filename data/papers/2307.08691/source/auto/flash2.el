(TeX-add-style-hook
 "flash2"
 (lambda ()
   (TeX-add-to-alist 'LaTeX-provided-package-options
                     '(("inputenc" "utf8") ("fontenc" "T1") ("cleveref" "capitalise") ("enumitem" "inline") ("natbib" "numbers" "sort") ("titlesec" "compact") ("savetrees" "subtle" "mathdisplays=tight" "charwidths=tight" "leading=normal")))
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "href")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperimage")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperbaseurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "nolinkurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "url")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "path")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "path")
   (TeX-run-style-hooks
    "latex2e"
    "src/abstract"
    "src/intro"
    "src/background"
    "src/algo"
    "src/experiments"
    "src/discussion"
    "article"
    "art10"
    "etoolbox"
    "inputenc"
    "fontenc"
    "hyperref"
    "url"
    "booktabs"
    "amsfonts"
    "nicefrac"
    "microtype"
    "xcolor"
    "amsmath"
    "amsthm"
    "amssymb"
    "algorithm"
    "algorithmic"
    "subcaption"
    "multirow"
    "xspace"
    "wrapfig"
    "pifont"
    "cleveref"
    "comment"
    "enumitem"
    "graphicx"
    "grffile"
    "color"
    "newtxmath"
    "natbib"
    "import"
    "titlesec"
    "savetrees"
    "authblk")
   (TeX-add-symbols
    '("norm" 1)
    '("abs" 1)
    '("TD" 1)
    '("todo" 1)
    "xmark"
    "main"
    "diag"
    "softmax"
    "dsoftmax"
    "tr"
    "defeq"
    "vQ"
    "vK"
    "vV"
    "vdQ"
    "vdK"
    "vdV"
    "vS"
    "vdS"
    "vP"
    "vdP"
    "vU"
    "vW"
    "vT"
    "vX"
    "vO"
    "vdO"
    "vM"
    "vZ"
    "sysnameone"
    "sysname"
    "setstretch")
   (LaTeX-add-bibliographies
    "ref")
   (LaTeX-add-lengths
    "defbaselineskip")
   (LaTeX-add-amsthm-newtheorems
    "theorem"
    "corollary"
    "definition"
    "lemma"
    "claim"
    "example"
    "proposition"))
 :latex)

