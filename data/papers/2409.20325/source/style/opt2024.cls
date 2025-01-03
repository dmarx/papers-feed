\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{style/opt2024}[2024/07/17 v1.0 OPT 2024 Style File]
% v2024: S. Stich
% v2023: S. Stich
% v2022: S. Stich
% v2021: S. Stich
% v2020: S. Stich
% v2019: S. Sra

\@ifundefined{ifanonsubmission}{
  \newif\ifanonsubmission
  \anonsubmissionfalse
}{}

\@ifundefined{iffinalsubmission}{
  \newif\iffinalsubmission
  \finalsubmissionfalse
}{}

\DeclareOption{anon}{\anonsubmissiontrue}
\DeclareOption{final}{\finalsubmissiontrue}
\ProcessOptions\relax

\LoadClass[wcp]{jmlr}

% modified so that header doesn't appear
\jmlrvolume{}
\jmlryear{}
\jmlrproceedings{wcp}{OPT2024: 16th Annual Workshop on Optimization for Machine Learning}

\ifanonsubmission
 \newcommand{\optauthor}[1]{}
 \author{author names withheld\\[2em] Under Review for OPT 2024}
 \jmlrworkshop{}
 \renewcommand{\acks}[1]{}
\else
 \newcommand{\optauthor}[1]{\author{#1}}
 \iffinalsubmission
  \editors{}
  \jmlrworkshop{}
 \fi
\fi

% patch for includegraphics not working with newer latex versions
\makeatletter
 \let\Ginclude@graphics\@org@Ginclude@graphics 
\makeatother





