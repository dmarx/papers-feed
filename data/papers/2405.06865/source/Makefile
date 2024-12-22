
.SUFFIXES: .dvi .ps

PAPER = vg
LATEX = latex
PDFLATEX = pdflatex -file-line-error -interaction=nonstopmode
TEXFILES = *.tex
BIBFILE=vg.bib

default: $(PAPER).pdf

$(PAPER).pdf: $(TEXFILES) $(ELFFILES) $(BIBFILE) $(OTHERFILE) makefile
	$(PDFLATEX) $(PAPER)
	bibtex $(PAPER)
	$(PDFLATEX) $(PAPER)
	$(PDFLATEX) $(PAPER)
	open $(PAPER).pdf

$(PAPER).ps: $(PAPER).dvi
	dvips -P cmz -t letter -o $(PAPER).ps $(PAPER).dvi

dvi: $(PAPER).dvi

ps: $(PAPER).ps

pdf: $(PAPER).pdf

preview: $(PAPER).dvi
	xdvi $(PAPER).dvi &

prevps: $(PAPER).ps
	ghostview $(PAPER).ps &

sendps: $(PAPER).ps
	sz $(PAPER).ps

sendpdf: $(PAPER).pdf
	sz $(PAPER).pdf

print: $(PAPER).ps
	lpr -Pmax $(PAPER).ps

clean:
	rm -fr *.ps *.dvi *.aux *.blg *.log *.lof *.lot *.out *.toc plots/*.eps plots/avg-tests/*.eps plots/eval/*.eps plots/heatmaps/*.eps $(PAPER).pdf *~ *.ent $(PAPER).synctex.gz $(PAPER).fls $(PAPER).fdb_latexmk

wc:
	wc -w $(TEXFILES)

ispell:
	ispell -b -t $(TEXFILES)

