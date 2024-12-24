paper = main_icml

# Grab all possible source
source := $(shell ls Makefile *.tex *.sty figures/*pdf figures/*png figures/*jpg 2>/dev/null)
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
	rm -rf *.aux *.blg *.bbl *.log *.out ${paper}.pdf





# The below targets are just used to produce an arXiv version. Not updated for this paper yet.

arxiv:
	pdflatex main
	bibtexall
	mkdir -p arxiv arxiv/figures
	cp -a main.tex main.bbl main.aux authors.tex *.sty arxiv/
	cp -aL figures/kd_large_final_detailed.pdf figures/kd_large_final.pdf figures/kd_small_final.pdf figures/kd_large_init.pdf figures/kd_small_init.pdf figures/kd_large_init_large_final.pdf figures/kd_small_init_small_final.pdf figures/kd_magnitude_increase.pdf figures/kd_movement.pdf figures/kd_random.pdf figures/pruning_methods_combined_crop.pdf figures/reinit_exps_combined_crop.pdf figures/freeze_init_exp_all_network.pdf figures/better_than_chance_init_crop.pdf figures/kd_large_final_same_sign.pdf figures/kd_large_final_diff_sign.pdf figures/supermask_combined_crop.pdf figures/kd_large_final_motion.pdf arxiv/figures/
	tar cvzf arxiv.tar.gz arxiv

arxiv-test: arxiv
	cd arxiv && pdflatex main && pdflatex main
