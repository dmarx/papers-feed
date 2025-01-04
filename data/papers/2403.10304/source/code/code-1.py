from kif_lib import *
Wikidata = Store('sparql', 'https://query.wikidata.org/sparql')
it = Wikidata.filter(
    subject=Item('http://www.wikidata.org/entity/Q2270'),
    property=Property('http://www.wikidata.org/entity/P2240'))
print(next(it))
