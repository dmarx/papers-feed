(TeX-add-style-hook
 "plotpga"
 (lambda ()
   (TeX-add-symbols
    '("includegraphics" ["argument"] 1)
    '("color" ["argument"] 1)
    '("rotatebox" 2)
    "gplgaddtomacro"
    "colorrgb"
    "colorgray")
   (LaTeX-add-lengths
    "gptboxheight"
    "gptboxwidth")
   (LaTeX-add-saveboxes
    "gptboxtext"))
 :latex)

