$sub_doc_output = 'output-subdoc';

@sub_doc_options = ();

push @sub_doc_options, '-pdf'; # Use pdflatex for compilation of external documents.
# Replace '-pdf' by '-pdfdvi', 'pdfxe', or 'pdflua' if needed.

push @file_not_found, '^No file\\s*(.+)\s*$';

add_cus_dep( 'tex', 'aux', 0, 'makeexternaldocument' );
sub makeexternaldocument {
    if ( $root_filename ne $_[0] )  {
        my ($base_name, $path) = fileparse( $_[0] );
        pushd $path;
        my $return = system "latexmk",
                            @sub_doc_options,
                            "-aux-directory=$sub_doc_output",
                            "-output-directory=$sub_doc_output",
                            $base_name;
        if ( ($sub_doc_output ne ' ') && ($sub_doc_output ne '.') ) {

             rdb_add_generated( "$sub_doc_output/$base_name.aux" );
             copy "$sub_doc_output/$base_name.aux", ".";
        }
        popd;
        return $return;
   }
}