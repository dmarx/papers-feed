reset
load '../gnuplot_style.gnu'
#set terminal eps transparent enhanced font "Times,7" fontscale 0.3

set size 1, 0.8

set output 'number-artwork.eps'

set xlabel 'Number of unique artwork'
set ylabel 'Mimimcry success rate'

set xrange [5 : 40]
set xtics 0, 5, 40
set mxtic 2

set yrange [0 : 1]
set ytics 0, 0.2, 1

set grid x

set key right bottom

# set label "Target Style" at 0.136, 0.072 tc rgb 'brown'
# set arrow from 0.0,0.066 to 0.21,0.066 nohead ls 2 linewidth 9 linecolor rgb 'brown'

set style fill transparent solid 0.2 noborder

plot 'data/number-artwork.txt' using 1:2 with linespoints linestyle 1 pointtype 2 pointsize 2 linecolor rgb 'black' notitle, \

exit
