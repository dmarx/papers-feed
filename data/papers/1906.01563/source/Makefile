paper = hnn

# Grab all possible source
source := $(shell ls *.tex *.sty images/*pdf images/*png images/*jpg 2>/dev/null)
sourcebib := $(shell ls *.bib )



all: ${paper}.pdf

${paper}.bbl: ${sourcebib}
	pdflatex ${paper}
	bibtexall
	pdflatex ${paper}

${paper}.pdf: ${paper}.bbl ${source}
	pdflatex ${paper}
	pdflatex ${paper}

quick:
	pdflatex -halt-on-error ${paper}

skim:
	skimreload ${paper}.pdf

skimbg:
	skimreloadbg ${paper}.pdf

watch:
	make quick skimbg; while true; do for file in ${source}; do if [ "$$file" -nt ${paper}.pdf ]; then echo "NEWER: $$file than ${paper}.pdf"; make quick skimbg || (echo "==== ERROR ====" && touch ${paper}.pdf); fi; done; sleep 1; done

clean:
	rm -rf *.aux *.blg *.bbl *.log *.out ${paper}.pdf arxiv





# The below targets are just used to produce an arXiv version
# (old version; not updated for this paper yet...)

arxiv:
	pdflatex main
	bibtexall
	mkdir -p arxiv arxiv/figures
	cp -a main.tex main.bbl authors.tex *.sty arxiv/
	cp -aL ../figures/prediction_tree_mat-crop.pdf ../figures/stitching_conv1_results-crop.pdf ../figures/stitching_architecture-crop.pdf ../figures/match_vs_max_conv1_crop.pdf ../figures/average_correlation_all_conv_layers-crop.pdf ../figures/match_ims_top_bot_crop.pdf ../figures/cor_and_xcor_conv1_crop.pdf ../figures/conv5_metric.png ../figures/conv4_metric.png ../figures/conv3_metric.png ../figures/conv2_metric.png ../figures/conv1_metric.png ../figures/hierarchical.jpg ../figures/conv2_top8_200dpi.jpg   arxiv/figures/
	tar cvzf arxiv.tar.gz arxiv

arxiv-test: arxiv
	cd arxiv && pdflatex main
