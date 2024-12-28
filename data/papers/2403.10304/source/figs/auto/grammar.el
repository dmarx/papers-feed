(TeX-add-style-hook
 "grammar"
 (lambda ()
   (setq TeX-command-extra-options
         "-shell-escape")
   (TeX-add-symbols
    '("NT" 1)
    '("xcode" 1)
    "EQ")
   (LaTeX-add-labels
    "fig:wikibase-sexp"))
 :latex)

