(TeX-add-style-hook
 "benzene-deep"
 (lambda ()
   (setq TeX-command-extra-options
         "-shell-escape")
   (LaTeX-add-labels
    "fig:benzene-deep"))
 :latex)

