(TeX-add-style-hook
 "use-case"
 (lambda ()
   (setq TeX-command-extra-options
         "-shell-escape")
   (LaTeX-add-labels
    "fig:use-case"))
 :latex)

