# make -f Makefile_pdflatex

R = controlnet

pdf: $(R).pdf

$(R).bbl: $(R).bib
	pdflatex $(R)
	bibtex $(R)
	pdflatex $(R)

$(R).pdf: *.tex $(R).bbl
	pdflatex $(R)

notes:
	pdflatex "\def\MakeWithNotes{}\input{$(R)}"

wo:
	pdflatex "\def\MakeWithoutNotes{}\input{$(R)}"

clean:
	rm -f $(R).log $(R).aux $(R).bbl $(R).blg $(R).out

