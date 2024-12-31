\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{ngsm2024}[2023/07/13 v1.0 OPT 2023 Style File]
% v1.0, all rights to the OPT2023 workshop organizers

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
\jmlrproceedings{wcp}{ICML 2024 Next Generation of Sequence Modeling Architectures Workshop}


\ifanonsubmission
 \newcommand{\optauthor}[1]{}
 \author{author names withheld\\[2em] Under Review for NGSM 2024}
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





