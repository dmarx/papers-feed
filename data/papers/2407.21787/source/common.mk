
# common.mk : Common makefile for building tex documents.
#
# This file should be included at the end of a top-level makefile that
# defines:
#
#   NAME_TEXFILE    - the name of the main tex file (becomes name of output)
#   OTHER_TEXFILES  - list of tex files constituting document
#   BIBFILE         - bib file for document


ifndef MAIN_TEXFILE
$(error No main tex file specified)
endif

ifndef BIBFILE
$(error No bib file specified)
endif

ifndef SUPPLEMENTAL_TEXFILE
$(error No supplemental tex file specified)
endif
#
ifndef SUPPLEMENTAL_BIBFILE
$(error No supplemental bib file specified)
endif


NAME = $(basename $(MAIN_TEXFILE))

ARXIV_NAME = arxiv

TEXFILES = $(MAIN_TEXFILE) $(OTHER_TEXFILES)

SUPPLEMENTAL_NAME = supplemental
#
SUPPLEMENTAL_TEXFILES = $(SUPPLEMENTAL_TEXFILE) $(OTHER_TEXFILES)


PDFLATEX_FLAGS = "--shell-escape"


all: $(NAME).pdf # $(SUPPLEMENTAL_NAME).pdf

main: $(NAME).pdf

arxiv: $(ARXIV_NAME).pdf

supp: $(SUPPLEMENTAL_NAME).pdf

$(NAME).pdf: $(TEXFILES) $(TEXMACRO_FILE) $(BIBFILE)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	bibtex $(basename $(BIBFILE))
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)

$(SUPPLEMENTAL_NAME).pdf: $(SUPPLEMENTAL_TEXFILES) $(TEXMACRO_FILE) $(SUPPLEMENTAL_BIBFILE)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	bibtex $(basename $(SUPPLEMENTAL_BIBFILE))
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)

$(ARXIV_NAME).pdf: $(ARXIV_TEXFILE) $(TEXFILES) $(TEXMACRO_FILE) $(BIBFILE)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	bibtex $(basename $(ARXIV_BIBFILE))
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)
	pdflatex ${PDFLATEX_FLAGS} $(basename $@)

clean:
	@rm -rf *.aux *.bbl *.log *.dvi *.blg *.ps *.bak *~ *.toc *.lot *.lof *.out *.fdb_latexmk *.fls *.synctex.gz $(NAME).pdf $(SUPPLEMENTAL_NAME).pdf $(ARXIV_NAME).pdf

spell: $(SPELL)

%.spell:
	aspell check $*
