paper = iclr2018_lrb_arxiv

# Grab all possible source
source := $(shell ls *.tex *.sty figs/*pdf figs/*png figs/*jpg 2>/dev/null)
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

watch: quick skim
	while true; do for file in ${source}; do if [ "$$file" -nt ${paper}.pdf ]; then make quick skimbg; fi; done; sleep 1; done

clean:
	rm -rf *.aux *.blg *.bbl *.log *.out ${paper}.pdf ${supp}.pdf arxiv





# The below targets are just used to produce an arXiv version
# (old version; not updated for this paper yet...)

arxiv:
	pdflatex main
	bibtexall
	mkdir -p arxiv arxiv/figures
	cp -a main.tex main.bbl authors.tex *.sty arxiv/
	cp -aL ../figures/prediction_tree_mat-crop.pdf ../figures/stitching_conv1_results-crop.pdf ../figures/stitching_architecture-crop.pdf ../figures/match_vs_max_conv1_crop.pdf ../figures/average_correlation_all_conv_layers-crop.pdf ../figures/match_ims_top_bot_crop.pdf ../figures/cor_and_xcor_conv1_crop.pdf ../figures/conv5_metric.png ../figures/conv4_metric.png ../figures/conv3_metric.png ../figures/conv2_metric.png ../figures/conv1_metric.png ../figures/hierarchical.jpg ../figures/conv2_top8_200dpi.jpg ../figures/conv1_top12.jpg ../figures/conv5_spectral.pdf ../figures/conv4_spectral.jpg ../figures/conv3_spectral.jpg ../figures/conv2_spectral.jpg ../figures/conv1_spectral.pdf ../figures/match_mi_top_bot-crop.pdf ../figures/match_vs_max_conv5_crop.pdf ../figures/match_vs_max_conv4_crop.pdf ../figures/match_vs_max_conv3_crop.pdf ../figures/match_vs_max_conv2_crop.pdf ../figures/highest_lowest_conv2_crop.pdf ../figures/highest_lowest_conv1_crop.pdf ../figures/means_nets1234_crop.pdf ../figures/conv2_30_26_activation_cor_ori_crop.jpg ../figures/conv2_122_236_activation_cor_ori_crop.jpg ../figures/conv1_2_74_activation_cor_ori_crop.jpg ../figures/conv1_34_48_activation_cor_ori_crop.jpg ../figures/match_ims_top_bot_9_conv12345_crop.pdf   arxiv/figures/
	tar cvzf arxiv.tar.gz arxiv

arxiv-test: arxiv
	cd arxiv && pdflatex main
