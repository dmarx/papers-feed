(TeX-add-style-hook
 "pattern-evaluation"
 (lambda ()
   (setq TeX-command-extra-options
         "-shell-escape")
   (LaTeX-add-labels
    "fig:pattern-evaluation"))
 :latex)

