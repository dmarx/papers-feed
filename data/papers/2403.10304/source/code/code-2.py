from kif_lib import *
from kif_lib.vocabulary import wd
Wikidata = Store('sparql', 'https://query.wikidata.org/sparql')
stmt1, *rest = Wikidata.filter(wd.benzene, wd.mass, limit=1)
(_, annots), *rest = Wikidata.get_annotations([stmt1])
print(list(annots)[0])
