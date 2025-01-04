from kif_lib import *
from kif_lib.store.mapping import PubChemMapping
from kif_lib.vocabulary import wd
PubChem = Store(
    'sparql-mapper', 'http://power.br.ibm.com:8890/sparql/', PubChemMapping())
it = PubChem.filter(
    subject=wd.InChIKey('UHOVQNZJYSORNB-UHFFFAOYSA-N'),
    property=wd.mass,
    value=Quantity('78.11'))
print(next(it))
