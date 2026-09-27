"""Parche de datos v4: Galeón San José, iglesias, Cartagena hoy (2026). Idempotente."""
import json, pathlib
D = pathlib.Path(__file__).resolve().parents[1] / 'site' / 'data'
J = lambda n: json.loads((D / f'{n}.json').read_text(encoding='utf-8'))
def W(n, obj): (D / f'{n}.json').write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
bi = lambda es, en: {'es': es, 'en': en}
OSM = 'Verificada sobre la cartografía de OpenStreetMap (26/09/2026)'
ALL_AFTER = lambda first: ['fundacion', 'amurallada', 'asedios', 'sistema', 'independencia', 'sigloXIX', 'sigloXX', 'contemporanea'][
    ['fundacion', 'amurallada', 'asedios', 'sistema', 'independencia', 'sigloXIX', 'sigloXX', 'contemporanea'].index(first):]
def ph(pid, author, alt_es, alt_en, ang_es, ang_en, specific=True):
    x = {'pexels': pid, 'author': author, 'alt': bi(alt_es, alt_en), 'angle': bi(ang_es, ang_en)}
    if not specific: x['specific'] = False
    return x

# ---------------- Fuentes ----------------
sources = J('sources')
new_sources = [
    ('wiki-catedral', 'secundaria', 'Wikipedia (es)', 'Catedral de Santa Catalina de Alejandría (Cartagena de Indias)', 'https://es.wikipedia.org/wiki/Catedral_de_Santa_Catalina_de_Alejandr%C3%ADa_(Cartagena_de_Indias)'),
    ('aecid-cf', 'oficial', 'AECID – Centro de Formación de la Cooperación Española en Cartagena', 'Instalaciones: historia del claustro de Santo Domingo', 'https://cfcartagena.aecid.es/cf/instalaciones'),
    ('aecid-museo', 'oficial', 'AECID, 09/06/2022', 'El Centro de Formación en Cartagena de Indias inaugura el Museo de Sitio', 'https://www.aecid.es/w/el-centro-de-formacion-de-la-cooperacion-espanola-en-cartagena-de-indias-inaugura-el-museo-de-sitio-y-una-nueva-sala-de-exposiciones'),
    ('reyes-2010', 'académica', 'Revista M (Universidad Santo Tomás), vol. 7, n.º 1', 'Reyes Rodríguez, M. F. (2010). El convento de Santo Domingo en Cartagena de Indias', 'https://revistas.ustabuca.edu.co/index.php/REVISTAM/article/view/1014'),
    ('santamaria-2020', 'académica', 'Universidade Federal da Integração Latino-Americana (UNILA)', 'Santamaría Alvarado, A. (2020). Valoración cultural: Plaza de la Santísima Trinidad, Getsemaní', 'https://dspace.unila.edu.br/items/07569001-51f8-40c0-a907-00ca264c5e9e'),
    ('procolombia-toribio', 'oficial', 'Colombia Travel (ProColombia)', 'Church of Santo Toribio de Mogrovejo', 'https://colombia.travel/en/cartagena-de-indias/church-santo-toribio-de-mogrovejo'),
    ('wiki-toribio', 'secundaria', 'Wikipedia (es)', 'Iglesia de Santo Toribio (Cartagena de Indias)', 'https://es.wikipedia.org/wiki/Iglesia_de_Santo_Toribio_(Cartagena_de_Indias)'),
    ('eltiempo-claver', 'medio', 'El Tiempo, 03/04/2021', 'Cartagena: la historia de la iglesia San Pedro Claver', 'https://www.eltiempo.com/colombia/otras-ciudades/cartagena-la-historia-de-la-iglesia-san-pedro-claver-578051'),
    ('wiki-claver-iglesia', 'secundaria', 'Wikipedia (es)', 'Iglesia de San Pedro Claver (Cartagena)', 'https://es.wikipedia.org/wiki/Iglesia_de_San_Pedro_Claver_(Cartagena)'),
    ('wiki-wager', 'secundaria', 'Wikipedia (en)', "Wager's Action (1708)", 'https://en.wikipedia.org/wiki/Wager%27s_Action'),
    ('icanh-sgc-2026', 'oficial', 'ICANH, 10/08/2026', 'El Servicio Geológico Colombiano presentó los resultados de sus investigaciones sobre los objetos recuperados del galeón San José', 'https://www.icanh.gov.co/prensa/actualidad-icanh/servicio-geologico-colombiano-presento-los-resultados-de-sus-investigaciones-sobre-los-objetos-arqueologicos-recuperados-del-galeon-san-jose'),
    ('eltiempo-galeon-2025', 'medio', 'El Tiempo, 24/12/2025', 'Hallazgos inéditos del galeón San José y lo que vendrá en 2026', 'https://www.eltiempo.com/cultura/arte-y-teatro/lo-que-no-se-veia-en-las-imagenes-ahora-esta-apareciendo-hallazgos-ineditos-del-galeon-san-jose-y-lo-que-vendra-en-el-2026-para-la-investigacion-3519550'),
    ('eltiempo-malecon-2026', 'medio', 'El Tiempo, 10/07/2026', 'El Gran Malecón del Mar avanza en un 57,60 %', 'https://www.eltiempo.com/colombia/otras-ciudades/cartagena-el-gran-malecon-del-mar-la-obra-insigne-de-la-actual-administracion-avanza-en-un-57-60-por-ciento-y-su-costo-supera-los-196-000-millones-3570427'),
    ('metro-malecon-2026', 'medio', 'Revista Metro (Cartagena), 25/09/2026', 'El alcalde y el contralor recorrieron las obras del Gran Malecón y de la protección costera', 'https://revistametro.co/2026/09/el-alcalde-de-cartagena-y-el-contralor-general-recorrieron-las-obras-del-gran-malecon-y-del-proyecto-de-proteccion-costera/'),
    ('universal-defensa-2026', 'medio', 'El Universal (Cartagena), 21/05/2026', 'Defensa Costera 2050: así avanzan las obras en Cartagena', 'https://www.eluniversal.com.co/cartagena/2026/05/21/defensa-costera-2050-asi-avanzan-las-obras-en-cartagena/'),
    ('procolombia-playas', 'oficial', 'Colombia Travel (ProColombia)', 'Cartagena: beaches and the Rosario Islands', 'https://colombia.travel/en/cartagena-de-indias/beaches-and-islands-rosario'),
    ('pnn-rosario', 'oficial', 'Parques Nacionales Naturales de Colombia', 'PNN Corales del Rosario y de San Bernardo', 'https://www.parquesnacionales.gov.co/nuestros-parques/pnn-corales-del-rosario-y-de-san-bernardo/'),
]
have = {s['id'] for s in sources}
for sid, typ, org, title, url in new_sources:
    if sid not in have: sources.append({'id': sid, 'type': typ, 'org': org, 'title': title, 'url': url})
W('sources', sources)

# ---------------- Eventos ----------------
events = J('events')
E = lambda i, y, per, d, t, tx, cert, pl, src: {'id': i, 'year': y, 'date': d, 'period': per, 'title': t, 'text': tx, 'certainty': cert, 'places': pl, 'sources': src}
new_events = [
    E('e1552-incendio', 1552, 'fundacion', bi('1552', '1552'),
      bi('El fuego arrasa la primera iglesia', 'Fire destroys the first church'),
      bi('La primera iglesia de la ciudad, levantada entre 1535 y 1537 con madera y techo de paja, se perdió en el incendio de 1552.',
         'The city’s first church, built between 1535 and 1537 of wood with a thatched roof, was lost in the fire of 1552.'),
      'consenso', ['catedral'], ['wiki-catedral', 'aecid-cf']),
    E('e1577-catedral', 1577, 'fundacion', bi('1577', '1577'),
      bi('Empieza la catedral actual', 'Work begins on today’s cathedral'),
      bi('Tras un concurso de diseños, el maestro Simón González dirige las obras de la catedral de piedra que hoy conocemos.',
         'After a design competition, master builder Simón González leads work on the stone cathedral we see today.'),
      'consenso', ['catedral'], ['wiki-catedral']),
    E('e1612-catedral', 1612, 'amurallada', bi('hacia 1612', 'around 1612'),
      bi('Se termina la catedral', 'The cathedral is completed'),
      bi('Tras los daños del ataque de Drake (1586) y el derrumbe de parte de la cubierta en 1600, las obras concluyen hacia 1612.',
         'After the damage of Drake’s raid (1586) and the collapse of part of the roof in 1600, the work is finished around 1612.'),
      'consenso', ['catedral'], ['wiki-catedral']),
    E('e1643-trinidad', 1643, 'amurallada', bi('1643', '1643'),
      bi('Getsemaní tiene su iglesia', 'Getsemaní gets its church'),
      bi('Para atender al barrio de Getsemaní, que crecía rápido, se inicia la iglesia de la Santísima Trinidad; se terminó hacia 1688.',
         'To serve the fast-growing Getsemaní quarter, work begins on the Church of the Holy Trinity; it was finished around 1688.'),
      'consenso', ['iglesia-trinidad'], ['santamaria-2020']),
    E('e1666-toribio', 1666, 'amurallada', bi('1666', '1666'),
      bi('Comienza Santo Toribio', 'Santo Toribio is begun'),
      bi('En el barrio de San Diego se inicia la iglesia de Santo Toribio de Mogrovejo, una de las últimas de la época colonial.',
         'In the San Diego quarter, work starts on the Church of Santo Toribio de Mogrovejo, one of the last of the colonial era.'),
      'consenso', ['iglesia-santo-toribio'], ['wiki-toribio', 'procolombia-toribio']),
    E('e1708-galeon', 1708, 'asedios', bi('8 de junio de 1708', '8 June 1708'),
      bi('Se hunde el galeón San José', 'The San José galleon sinks'),
      bi('Frente a Barú, una escuadra británica al mando de Charles Wager ataca la flota española que navegaba hacia Cartagena. Hacia las 7 de la noche el San José, buque insignia, estalla y se hunde. De unas 600 personas a bordo, solo 11 sobreviven.',
         'Off Barú, a British squadron under Charles Wager attacks the Spanish fleet sailing to Cartagena. At around 7 p.m. the flagship San José blows up and sinks. Of some 600 people on board, only 11 survive.'),
      'documentado', ['galeon-san-jose'], ['wiki-wager']),
    E('e1767-jesuitas', 1767, 'sistema', bi('1767', '1767'),
      bi('Expulsión de los jesuitas', 'The Jesuits are expelled'),
      bi('El rey Carlos III expulsa a la Compañía de Jesús. Su templo y su claustro en Cartagena —hoy San Pedro Claver— pasan a otras manos; el claustro llegó a funcionar como hospital. Los jesuitas regresaron en 1896.',
         'King Charles III expels the Society of Jesus. Its church and cloister in Cartagena — today San Pedro Claver — pass to others; the cloister was even used as a hospital. The Jesuits returned in 1896.'),
      'documentado', ['san-pedro-claver'], ['eltiempo-claver']),
    E('e2015-galeon', 2015, 'contemporanea', bi('27 de noviembre de 2015', '27 November 2015'),
      bi('La Armada encuentra el galeón', 'The Navy finds the galleon'),
      bi('La Armada de Colombia localiza el pecio; se anunció el 5 de diciembre. Una de las claves para identificarlo fueron sus cañones de bronce decorados con delfines.',
         'The Colombian Navy locates the wreck; it was announced on 5 December. One of the clues to its identity was its bronze cannons decorated with dolphins.'),
      'documentado', ['galeon-san-jose'], ['wiki-wager']),
    E('e2025-galeon', 2025, 'contemporanea', bi('noviembre de 2025', 'November 2025'),
      bi('Primeros objetos rescatados', 'First objects recovered'),
      bi('Una expedición científica liderada por el ICANH, con la Armada, la DIMAR y el Ministerio de las Culturas, recupera un cañón, tres monedas de oro (macuquinas), una taza de porcelana china, fragmentos de porcelana y un trozo de cuerda.',
         'A scientific expedition led by ICANH, with the Navy, DIMAR and the Ministry of Culture, recovers a cannon, three gold coins (macuquinas), a Chinese porcelain cup, porcelain fragments and a piece of rope.'),
      'documentado', ['galeon-san-jose'], ['eltiempo-galeon-2025', 'icanh-sgc-2026']),
    E('e2026-galeon', 2026, 'contemporanea', bi('10 de agosto de 2026', '10 August 2026'),
      bi('La ciencia lee los hallazgos', 'Science reads the finds'),
      bi('El Servicio Geológico Colombiano presenta sus análisis: datación por radiocarbono de la cuerda, caracterización química del cañón y estudio de los microorganismos que convivieron con los objetos durante más de 300 años.',
         'The Colombian Geological Survey presents its analyses: radiocarbon dating of the rope, chemical characterisation of the cannon and a study of the microorganisms that lived on the objects for over 300 years.'),
      'documentado', ['galeon-san-jose'], ['icanh-sgc-2026']),
    E('e2026-malecon', 2026, 'contemporanea', bi('septiembre de 2026', 'September 2026'),
      bi('El Gran Malecón del Mar toma forma', 'The Gran Malecón del Mar takes shape'),
      bi('Con un 70 % de avance, la Alcaldía programó abrir los primeros 2 km el 15 de octubre de 2026. La obra completa, de 5,1 km entre La Boquilla y La Tenaza, tiene plazo hasta junio de 2027.',
         'At 70% complete, the city scheduled the first 2 km to open on 15 October 2026. The full 5.1 km project, from La Boquilla to La Tenaza, is due by June 2027.'),
      'documentado', ['gran-malecon'], ['metro-malecon-2026', 'eltiempo-malecon-2026']),
]
ev_ids = {e['id'] for e in events}
events += [e for e in new_events if e['id'] not in ev_ids]
events.sort(key=lambda e: e['year'])
W('events', events)

# ---------------- Lugares ----------------
places = J('places')
P = {p['id']: p for p in places}

cat = P['catedral']
cat.update({
    'dates': bi('1577 – hacia 1612 · torre 1661–1681', '1577 – c. 1612 · tower 1661–1681'),
    'people': ['Simón González', 'Francis Drake', 'Gastón Lelarge'],
    'guide': bi('Esta catedral nació entre piratas. Se empezó en 1577 y aún estaba en obra cuando Francis Drake tomó la ciudad en 1586: sus cañones derribaron columnas y arcos. Se terminó hacia 1612, y su torre de colores, tal como la ves, es fruto de una reforma de comienzos del siglo XX.',
                'This cathedral was born among pirates. Begun in 1577, it was still being built when Francis Drake took the city in 1586, and his cannon fire brought down columns and arches. It was finished around 1612; its colourful tower as you see it today comes from an early 20th-century remodelling.'),
    'history': bi([
        'La primera iglesia de Cartagena se levantó entre 1535 y 1537 con madera y paja, y se perdió en el incendio de 1552. Tras un concurso de diseños, en 1577 empezaron las obras de la catedral de piedra, dirigidas por el maestro Simón González.',
        'En 1586, durante la toma de la ciudad por Francis Drake, un cañonazo destruyó tres columnas y cuatro arcos del templo en construcción. En 1600 se derrumbó parte de la cubierta, y las obras concluyeron hacia 1612. La torre se levantó entre 1661 y 1681.',
        'A comienzos del siglo XX el arquitecto francés Gastón Lelarge dirigió una gran remodelación que le dio a la torre su aspecto actual. En 1953 fue declarada basílica menor, y en 1973 se retiraron los estucos para recuperar la piedra original.'
    ], [
        'Cartagena’s first church was built between 1535 and 1537 of wood and thatch, and was lost in the fire of 1552. After a design competition, work on the stone cathedral began in 1577 under master builder Simón González.',
        'In 1586, during Francis Drake’s capture of the city, cannon fire destroyed three columns and four arches of the unfinished church. Part of the roof collapsed in 1600, and the work was completed around 1612. The tower was built between 1661 and 1681.',
        'In the early 20th century the French architect Gastón Lelarge led a major remodelling that gave the tower its present look. It was named a minor basilica in 1953, and in 1973 the stucco was removed to reveal the original stone.'
    ]),
    'note': bi('Estas fechas proceden de fuentes secundarias coincidentes; están pendientes de contrastar con un estudio académico específico.',
               'These dates come from matching secondary sources; they have yet to be checked against a dedicated academic study.'),
    'events': ['e1552-incendio', 'e1577-catedral', 'e1586-drake', 'e1612-catedral'],
    'sources': ['wiki-catedral', 'aecid-cf', 'wiki-cartagena', 'wiki-timeline'],
    'certainty': 'consenso',
})

sd = P['iglesia-santo-domingo']
sd.update({
    'built': {'from': 1579, 'to': None},
    'dates': bi('comunidad desde la década de 1530 · obras desde finales del siglo XVI', 'community from the 1530s · building from the late 16th century'),
    'guide': bi('Los dominicos estuvieron entre los primeros religiosos en llegar a Cartagena. Su iglesia es de las más antiguas de la ciudad, y el claustro de al lado, restaurado a comienzos de este siglo, guarda hoy un pequeño museo con piezas halladas durante las obras.',
                'The Dominicans were among the first religious orders to reach Cartagena. Their church is one of the oldest in the city, and the cloister next door, restored early this century, now houses a small museum with objects found during the work.'),
    'history': bi([
        'La orden de Santo Domingo llegó a Cartagena en los primeros años de la ciudad: la AECID sitúa su llegada a finales de 1534, y un estudio académico fecha el núcleo fundacional del convento en 1539. Sus primeras construcciones, de materiales ligeros, se perdieron en el incendio de 1552.',
        'La iglesia actual se empezó a finales del siglo XVI; para el convento, las fuentes difieren entre 1579 y el siglo XVII. Entre 2000 y 2004 el claustro fue restaurado por la Escuela Taller Cartagena de Indias con apoyo de la Cooperación Española, que tiene allí su centro de formación. En 2022 se inauguró su Museo de Sitio, con hallazgos de las obras, entre ellos cerámica prehispánica.'
    ], [
        'The Dominican order arrived in the city’s early years: AECID dates its arrival to late 1534, and an academic study dates the convent’s founding core to 1539. Its first buildings, of light materials, were lost in the fire of 1552.',
        'The present church was begun in the late 16th century; for the convent, sources differ between 1579 and the 17th century. Between 2000 and 2004 the cloister was restored by the Escuela Taller Cartagena de Indias with support from Spanish Cooperation, whose training centre is based there. In 2022 its Site Museum opened, showing finds from the works, including pre-Hispanic pottery.'
    ]),
    'note': bi('Las fechas exactas de construcción varían según la fuente; por eso damos rangos y no un año único.',
               'Exact construction dates vary by source, so we give ranges rather than a single year.'),
    'significance': bi('Una de las primeras órdenes religiosas de la ciudad y uno de sus templos más antiguos.', 'One of the city’s first religious orders and one of its oldest churches.'),
    'status': bi('Iglesia en culto; el claustro es sede del Centro de Formación de la Cooperación Española y tiene un Museo de Sitio.', 'The church is in use; the cloister houses the Spanish Cooperation Training Centre and a Site Museum.'),
    'events': ['e1552-incendio'],
    'sources': ['reyes-2010', 'aecid-cf', 'aecid-museo', 'wiki-timeline'],
    'certainty': 'consenso',
})

spc = P['san-pedro-claver']
spc['history']['es'] = spc['history']['es'][:2] + [
    'El templo era de la Compañía de Jesús. Tras la expulsión de los jesuitas ordenada por Carlos III en 1767, el conjunto pasó a otras manos y el claustro se usó como hospital; los jesuitas regresaron en 1896. Hoy los restos de Pedro Claver se veneran en el templo.']
spc['history']['en'] = spc['history']['en'][:2] + [
    'The church belonged to the Society of Jesus. After Charles III expelled the Jesuits in 1767, the complex passed to others and the cloister was used as a hospital; the Jesuits returned in 1896. Today Pedro Claver’s remains are venerated in the church.']
spc['note'] = bi('Las fuentes consultadas no coinciden en las fechas de construcción del templo actual, por eso no damos un año. Los datos biográficos proceden de la Enciclopedia del Banco de la República.',
                 'The sources consulted disagree on the construction dates of the present church, so we give no year. The biographical data come from the Banco de la República encyclopaedia.')
spc['events'] = ['e1622-claver', 'e1654-claver', 'e1767-jesuitas']
spc['sources'] = ['banrep-claver', 'eltiempo-claver', 'wiki-claver-iglesia']

new_places = [
  {
    'id': 'iglesia-trinidad', 'category': 'iglesia',
    'name': bi('Iglesia de la Santísima Trinidad', 'Church of the Holy Trinity'),
    'aka': ['Trinidad', 'Plaza de la Trinidad', 'Getsemaní', 'Iglesia'],
    'coords': [10.42039, -75.54544], 'loc': {'accuracy': 'exact', 'method': OSM},
    'built': {'from': 1643, 'to': None},
    'dates': bi('1643 – hacia 1688', '1643 – c. 1688'),
    'periods': ALL_AFTER('amurallada'), 'people': [],
    'guide': bi('Estás en el corazón de Getsemaní. Esta iglesia se construyó para un barrio que crecía rápido fuera del centro, y su plaza fue escenario del movimiento de independencia. Hoy, al caer la tarde, es el punto de encuentro de vecinos y viajeros.',
                'You are in the heart of Getsemaní. This church was built for a quarter that was growing fast outside the centre, and its square was a stage for the independence movement. Today, in the evening, it is where locals and travellers meet.'),
    'history': bi([
        'A comienzos del siglo XVII el obispo pidió al rey Felipe III recursos para atender al creciente barrio de Getsemaní. La construcción de la iglesia de la Santísima Trinidad empezó en 1643 y se completó hacia 1688.',
        'En el siglo XIX la plaza fue uno de los escenarios principales del movimiento de independencia de la ciudad. Un estudio de 2020 la describe como el «corazón del barrio» y advierte sobre la presión del turismo y la gentrificación.'
    ], [
        'In the early 17th century the bishop asked King Philip III for funds to serve the growing Getsemaní quarter. Construction of the Church of the Holy Trinity began in 1643 and was completed around 1688.',
        'In the 19th century the square was one of the main stages of the city’s independence movement. A 2020 study calls it the “heart of the neighbourhood” and warns of pressure from tourism and gentrification.'
    ]),
    'significance': bi('Templo y plaza que definen la vida de Getsemaní.', 'The church and square at the centre of life in Getsemaní.'),
    'status': bi('En culto; la plaza es espacio público muy concurrido por las noches.', 'In use for worship; the square is a busy public space in the evenings.'),
    'events': ['e1643-trinidad'], 'sources': ['santamaria-2020'], 'certainty': 'consenso', 'audio': bi(None, None)
  },
  {
    'id': 'iglesia-santo-toribio', 'category': 'iglesia',
    'name': bi('Iglesia de Santo Toribio de Mogrovejo', 'Church of Santo Toribio de Mogrovejo'),
    'aka': ['Santo Toribio', 'San Diego', 'Iglesia'],
    'coords': [10.42699, -75.54845], 'loc': {'accuracy': 'exact', 'method': OSM},
    'built': {'from': 1666, 'to': None},
    'dates': bi('desde 1666', 'from 1666'),
    'periods': ALL_AFTER('amurallada'), 'people': ['Toribio de Mogrovejo'],
    'guide': bi('Una iglesia pequeña con una gran anécdota: según la tradición, durante el sitio de 1741 una bala de cañón entró en plena misa. Por dentro guarda el único retablo barroco de la ciudad.',
                'A small church with a big story: according to tradition, a cannonball crashed in during Mass in the 1741 siege. Inside is the city’s only Baroque altarpiece.'),
    'history': bi([
        'Su construcción empezó en 1666 en el barrio de San Diego, y fue una de las últimas iglesias levantadas en la ciudad durante la época colonial. Está dedicada a Toribio de Mogrovejo, arzobispo de Lima.',
        'ProColombia recoge la historia de una bala que entró en el templo en 1741, en medio de la misa; la tomamos como tradición local. En su interior se conservan el único retablo barroco de la ciudad y pinturas murales de la época colonial.'
    ], [
        'Work began in 1666 in the San Diego quarter, making it one of the last churches built in the city during the colonial era. It is dedicated to Toribio de Mogrovejo, Archbishop of Lima.',
        'ProColombia tells of a cannonball that entered the church in 1741, in the middle of Mass; we treat this as local tradition. Inside are the city’s only Baroque altarpiece and colonial-era murals.'
    ]),
    'significance': bi('Última gran iglesia colonial del recinto amurallado.', 'The last major colonial church inside the walls.'),
    'status': bi('En culto.', 'In use for worship.'),
    'events': ['e1666-toribio', 'e1741-vernon'], 'sources': ['wiki-toribio', 'procolombia-toribio'], 'certainty': 'consenso', 'audio': bi(None, None)
  },
  {
    'id': 'galeon-san-jose', 'category': 'mar',
    'name': bi('Galeón San José', 'San José galleon'),
    'aka': ['Galeón', 'Galleon', 'San José', 'Naufragio', 'Shipwreck', 'Tesoro', 'Treasure', 'Barú'],
    'coords': [10.171, -75.661],
    'loc': {'accuracy': 'zone', 'radius': 14000,
            'method': 'Zona aproximada del combate de 1708 según la bibliografía (Wikipedia, «Wager’s Action»). La posición del naufragio es información reservada del Estado colombiano: este punto NO marca dónde está el galeón.'},
    'built': {'from': 1708, 'to': None},
    'dates': bi('hundido el 8 de junio de 1708 · hallado en 2015', 'sunk 8 June 1708 · found in 2015'),
    'periods': ['asedios', 'contemporanea'],
    'people': ['José Fernández de Santillán', 'Charles Wager'],
    'guide': bi('La historia más famosa del mar de Cartagena. En 1708, frente a Barú, el galeón San José estalló en pleno combate y se hundió con casi todos sus tripulantes. Durante tres siglos fue una leyenda; en 2015 la Armada lo encontró, y hoy la ciencia empieza a leer sus secretos.',
                'The most famous story of Cartagena’s sea. In 1708, off Barú, the San José galleon blew up in battle and sank with almost everyone on board. For three centuries it was a legend; in 2015 the Colombian Navy found it, and today science is beginning to read its secrets.'),
    'history': bi([
        'El 8 de junio de 1708, en plena Guerra de Sucesión española, una escuadra británica al mando de Charles Wager atacó frente a Barú a la flota española que navegaba hacia Cartagena. Hacia las 7 de la noche el San José, buque insignia al mando de José Fernández de Santillán, estalló y se hundió. De unas 600 personas a bordo sobrevivieron 11.',
        'Las fuentes estiman su carga entre 7 y 11 millones de pesos de la época, aunque la cifra real no se conoce. Por eso el naufragio se convirtió en leyenda y, durante décadas, en objeto de disputas legales sobre quién tenía derechos sobre él.',
        'El 27 de noviembre de 2015 la Armada de Colombia localizó el pecio; el hallazgo se anunció el 5 de diciembre. Sus cañones de bronce decorados con delfines ayudaron a identificarlo. Su posición exacta es reservada.',
        'En noviembre de 2025 una expedición liderada por el ICANH recuperó los primeros objetos: un cañón, tres monedas de oro (macuquinas), una taza de porcelana china, fragmentos de porcelana y un trozo de cuerda. En agosto de 2026 el Servicio Geológico Colombiano presentó sus análisis científicos.'
    ], [
        'On 8 June 1708, during the War of the Spanish Succession, a British squadron under Charles Wager attacked the Spanish fleet sailing to Cartagena off Barú. At around 7 p.m. the flagship San José, commanded by José Fernández de Santillán, blew up and sank. Of some 600 people on board, 11 survived.',
        'Sources estimate its cargo at 7 to 11 million pesos of the time, though the real figure is unknown. That is why the wreck became a legend and, for decades, the subject of legal disputes over who had rights to it.',
        'On 27 November 2015 the Colombian Navy located the wreck; the find was announced on 5 December. Its bronze cannons decorated with dolphins helped identify it. Its exact position is classified.',
        'In November 2025 an expedition led by ICANH recovered the first objects: a cannon, three gold coins (macuquinas), a Chinese porcelain cup, porcelain fragments and a piece of rope. In August 2026 the Colombian Geological Survey presented its scientific analyses.'
    ]),
    'note': bi('Las cifras de tripulantes, sobrevivientes y carga proceden de la bibliografía secundaria. El punto del mapa señala la zona aproximada del combate, no el lugar del naufragio.',
               'The figures for crew, survivors and cargo come from secondary sources. The map point marks the approximate area of the battle, not the wreck site.'),
    'significance': bi('El naufragio más célebre del Caribe y un patrimonio sumergido de la nación.', 'The Caribbean’s most famous shipwreck and part of the nation’s underwater heritage.'),
    'status': bi('Patrimonio sumergido protegido, en investigación científica. No se puede visitar.', 'Protected underwater heritage under scientific study. It cannot be visited.'),
    'events': ['e1708-galeon', 'e2015-galeon', 'e2025-galeon', 'e2026-galeon'],
    'sources': ['wiki-wager', 'eltiempo-galeon-2025', 'icanh-sgc-2026'], 'certainty': 'documentado', 'audio': bi(None, None),
    'photos': [
        ph(21336471, 'Renee B', 'Réplica moderna de un galeón amarrada en un puerto', 'A modern galleon replica moored in a harbour',
           'Así era un galeón (réplica moderna, no es el San José)', 'What a galleon looked like (modern replica, not the San José)', False),
        ph(11901399, 'Cesar Ricciulli', 'Un pescador en el mar de Cartagena al atardecer', 'A fisherman on the sea off Cartagena at sunset',
           'El mar donde ocurrió el combate (imagen ilustrativa)', 'The sea where the battle took place (illustrative)', False),
    ]
  },
  {
    'id': 'gran-malecon', 'category': 'hoy',
    'name': bi('Gran Malecón del Mar', 'Gran Malecón del Mar (seafront promenade)'),
    'aka': ['Malecón', 'Promenade', 'Marbella', 'El Cabrero', 'Crespo', 'La Tenaza', 'Rueda', 'Mirador del Sol', 'Obras 2026'],
    'coords': [10.43520, -75.53913],
    'loc': {'accuracy': 'zone', 'method': 'Trazado aproximado a lo largo de la costa entre La Tenaza, El Cabrero, Marbella, Crespo y La Boquilla, a partir de puntos verificados en OpenStreetMap (26/09/2026). No es el plano de obra.'},
    'path': [[10.43112, -75.54612], [10.43191, -75.54308], [10.43520, -75.53913], [10.43621, -75.53592], [10.43820, -75.53111], [10.44980, -75.51880], [10.47604, -75.49470]],
    'dates': bi('en construcción (2026) · plazo: junio de 2027', 'under construction (2026) · due: June 2027'),
    'periods': ['contemporanea'], 'people': [],
    'guide': bi('La Cartagena de hoy también se construye frente al mar. El Gran Malecón del Mar será un paseo de 5,1 km junto a la playa, desde La Boquilla hasta La Tenaza, con senderos, ciclorruta, zonas verdes y un mirador con rueda panorámica. Los primeros tramos se abren este otoño de 2026.',
                'Today’s Cartagena is also being built by the sea. The Gran Malecón del Mar will be a 5.1 km seafront promenade from La Boquilla to La Tenaza, with walkways, a cycle path, green areas and a viewpoint with a Ferris wheel. The first stretches open in autumn 2026.'),
    'history': bi([
        'El proyecto recorre 5,1 km de costa entre Playa Azul de La Boquilla y La Tenaza, pasando por el túnel de Crespo, Marbella y El Cabrero. Incluye estructuras de protección costera (espolones), ciclorrutas, senderos peatonales, zonas verdes, un centro de información turística y el Mirador del Sol, con una rueda panorámica.',
        'En julio de 2026 la obra iba en un 57,6 %; a finales de septiembre, en un 70 %. La Alcaldía programó abrir los primeros 2 km el 15 de octubre de 2026, y el contrato va hasta junio de 2027.',
        'En paralelo avanza la Defensa Costera 2050, con espolones en Castillogrande, Marbella, El Cabrero, la avenida Santander y La Bocana. Su primera fase, entre Playa Hollywood y la plaza de Bocagrande, tiene como meta abril de 2027.'
    ], [
        'The project runs along 5.1 km of coast from Playa Azul in La Boquilla to La Tenaza, via the Crespo tunnel, Marbella and El Cabrero. It includes coastal-protection groynes, cycle paths, walkways, green areas, a tourist information centre and the Mirador del Sol viewpoint with a Ferris wheel.',
        'In July 2026 the work was 57.6% complete; by late September, 70%. The city scheduled the first 2 km to open on 15 October 2026, and the contract runs to June 2027.',
        'Alongside it, the Coastal Defence 2050 programme is building groynes in Castillogrande, Marbella, El Cabrero, Avenida Santander and La Bocana. Its first phase, between Playa Hollywood and Bocagrande square, is due in April 2027.'
    ]),
    'note': bi('Información de actualidad: obra en curso. Fechas y avances según la prensa local al 25/09/2026; pueden cambiar.',
               'Current information: work in progress. Dates and progress per local press as of 25/09/2026; they may change.'),
    'significance': bi('La gran obra urbana de la Cartagena de 2026: un paseo público frente al mar y una defensa ante la erosión.', 'Cartagena’s major urban project of 2026: a public seafront promenade and a defence against erosion.'),
    'status': bi('En construcción (70 % en septiembre de 2026).', 'Under construction (70% in September 2026).'),
    'events': ['e2026-malecon'], 'sources': ['eltiempo-malecon-2026', 'metro-malecon-2026', 'universal-defensa-2026'],
    'certainty': 'documentado', 'audio': bi(None, None), 'tourism': True,
    'photos': [
        ph(11815929, 'Kelly', 'La costa de Cartagena con Bocagrande y el mar', 'Cartagena’s coast, with Bocagrande and the sea',
           'La costa de la ciudad hoy (el malecón aún está en obra)', 'The city’s coast today (the promenade is still being built)', False),
        ph(10323093, 'Roma Diachkin', 'Un pescador lanza su red frente a los edificios de Cartagena', 'A fisherman casts his net in front of Cartagena’s buildings',
           'La vida frente al mar', 'Life by the sea', False),
    ]
  },
  {
    'id': 'playas-bocagrande', 'category': 'hoy',
    'name': bi('Playas de Bocagrande y Castillogrande', 'Bocagrande and Castillogrande beaches'),
    'aka': ['Bocagrande', 'Castillogrande', 'Playa', 'Beach', 'Playas'],
    'coords': [10.40409, -75.55342], 'loc': {'accuracy': 'zone', 'method': OSM + '. Zona de playas de la península, no un punto exacto.'},
    'dates': bi('información turística actual', 'current visitor information'),
    'periods': ['contemporanea'], 'people': [],
    'guide': bi('A pocos minutos del centro histórico está la Cartagena de los rascacielos. En la península de Bocagrande hay playas urbanas; en la de Castillogrande, del lado de la bahía, el agua suele estar más calmada.',
                'A few minutes from the old town is the Cartagena of skyscrapers. The Bocagrande peninsula has city beaches; at Castillogrande, on the bay side, the water is usually calmer.'),
    'history': bi([
        'La península de Bocagrande reúne hoteles, apartamentos y playas urbanas. ProColombia destaca Castillogrande por sus aguas tranquilas y claras.',
        'Aquí mismo se levantó en 1626 el fuerte de Santa Cruz de Castillogrande, uno de los primeros del sistema defensivo de la bahía.'
    ], [
        'The Bocagrande peninsula is home to hotels, apartments and city beaches. ProColombia highlights Castillogrande for its calm, clear water.',
        'The Fort of Santa Cruz de Castillogrande, one of the first in the bay’s defensive system, was built here in 1626.'
    ]),
    'significance': bi('Las playas urbanas de la ciudad moderna.', 'The modern city’s urban beaches.'),
    'status': bi('Playas públicas.', 'Public beaches.'),
    'visit': {'es': 'A pocos minutos en taxi desde el centro histórico. Consulta el estado del mar y las indicaciones de los salvavidas.', 'en': 'A few minutes by taxi from the historic centre. Check sea conditions and lifeguard advice.', 'checked': '2026-09-26', 'source': 'procolombia-playas'},
    'events': [], 'sources': ['procolombia-playas', 'etcar-castillogrande'], 'certainty': 'documentado', 'audio': bi(None, None), 'tourism': True,
    'photos': [
        ph(13806427, 'Camilo Ruiz Vasquez', 'Bañistas en la playa de Bocagrande', 'Beachgoers at Bocagrande', 'La playa de Bocagrande', 'Bocagrande beach'),
        ph(11815906, 'Kelly', 'Los edificios de Bocagrande frente al mar', 'Bocagrande’s buildings by the sea', 'Bocagrande desde el aire', 'Bocagrande from the air'),
    ]
  },
  {
    'id': 'la-boquilla', 'category': 'hoy',
    'name': bi('La Boquilla', 'La Boquilla'),
    'aka': ['Boquilla', 'Playa', 'Beach', 'Manglar', 'Mangroves', 'Pescadores'],
    'coords': [10.47604, -75.49470], 'loc': {'accuracy': 'zone', 'method': OSM + '. Zona del corregimiento, no un punto exacto.'},
    'dates': bi('información turística actual', 'current visitor information'),
    'periods': ['contemporanea'], 'people': [],
    'guide': bi('Al norte de la ciudad, pasando el aeropuerto, está La Boquilla: una playa larga y un pueblo de pescadores cerca del centro. Aquí empezará el Gran Malecón del Mar.',
                'North of the city, past the airport, lies La Boquilla: a long beach and a fishing village close to the centre. This is where the Gran Malecón del Mar will begin.'),
    'history': bi([
        'ProColombia la describe como una playa famosa por su cercanía al centro histórico. Es el extremo norte del Gran Malecón del Mar, que arranca en Playa Azul.'
    ], [
        'ProColombia describes it as a well-known beach, close to the historic centre. It is the northern end of the Gran Malecón del Mar, which starts at Playa Azul.'
    ]),
    'significance': bi('Playa y comunidad tradicional al norte de la ciudad.', 'A beach and traditional community north of the city.'),
    'status': bi('Playa pública y comunidad habitada.', 'Public beach and living community.'),
    'visit': {'es': 'Se llega por la vía al Mar, al norte del aeropuerto. Respeta a la comunidad y contrata servicios con operadores formales.', 'en': 'Reached via the Vía al Mar, north of the airport. Respect the community and book services with licensed operators.', 'checked': '2026-09-26', 'source': 'procolombia-playas'},
    'events': [], 'sources': ['procolombia-playas', 'eltiempo-malecon-2026'], 'certainty': 'documentado', 'audio': bi(None, None), 'tourism': True
  },
  {
    'id': 'playa-blanca', 'category': 'hoy',
    'name': bi('Playa Blanca (Barú)', 'Playa Blanca (Barú)'),
    'aka': ['Barú', 'Playa', 'Beach', 'Playas'],
    'coords': [10.22431, -75.60779], 'loc': {'accuracy': 'approx', 'method': OSM},
    'dates': bi('información turística actual', 'current visitor information'),
    'periods': ['contemporanea'], 'people': [],
    'guide': bi('Arena blanca y agua turquesa en la isla de Barú, a unos 40 minutos de la ciudad. Es la postal caribeña que muchos viajeros buscan.',
                'White sand and turquoise water on Barú island, about 40 minutes from the city. It’s the Caribbean postcard many travellers come for.'),
    'history': bi([
        'ProColombia la presenta como una playa de arena blanca y aguas cristalinas, a unos 40 minutos de Cartagena. Frente a estas aguas de Barú ocurrió en 1708 el combate en que se hundió el galeón San José.'
    ], [
        'ProColombia describes it as a white-sand beach with crystal-clear water, about 40 minutes from Cartagena. Off these Barú waters, in 1708, the battle took place in which the San José galleon sank.'
    ]),
    'significance': bi('La playa más conocida cerca de Cartagena.', 'The best-known beach near Cartagena.'),
    'status': bi('Playa pública; muy concurrida en temporada alta.', 'Public beach; very busy in high season.'),
    'visit': {'es': 'Unos 40 minutos desde la ciudad (por carretera o en lancha, según el operador). Verifica precios y condiciones antes de ir.', 'en': 'About 40 minutes from the city (by road or boat, depending on the operator). Check prices and conditions before you go.', 'checked': '2026-09-26', 'source': 'procolombia-playas'},
    'events': ['e1708-galeon'], 'sources': ['procolombia-playas'], 'certainty': 'documentado', 'audio': bi(None, None), 'tourism': True,
    'photos': [
        ph(35211242, 'Juan Coronel', 'Vista aérea de una playa de aguas turquesa en Bolívar', 'Aerial view of a turquoise beach in Bolívar',
           'Playa del Caribe en Bolívar (imagen ilustrativa)', 'A Caribbean beach in Bolívar (illustrative)', False),
        ph(39332129, 'Jose Manuel Reyes Aguilar', 'Playa con sombrillas de palma en Bolívar', 'A beach with palm umbrellas in Bolívar',
           'Sombrillas de palma (imagen ilustrativa)', 'Palm umbrellas (illustrative)', False),
    ]
  },
  {
    'id': 'islas-rosario', 'category': 'hoy',
    'name': bi('Islas del Rosario', 'Rosario Islands'),
    'aka': ['Rosario', 'Islas', 'Islands', 'Corales', 'Parque Nacional', 'Playa', 'Beach'],
    'coords': [10.18064, -75.74632], 'loc': {'accuracy': 'zone', 'radius': 6000, 'method': OSM + '. Archipiélago: zona, no un punto exacto.'},
    'dates': bi('información turística actual', 'current visitor information'),
    'periods': ['contemporanea'], 'people': [],
    'guide': bi('Unas 28 islas de arena blanca y arrecifes de coral, a cerca de una hora en lancha. Forman parte de un parque nacional natural: se visitan con cuidado.',
                'Some 28 islands of white sand and coral reefs, about an hour away by boat. They are part of a national natural park, so visit with care.'),
    'history': bi([
        'El archipiélago tiene unas 28 islas y se llega en lancha en cerca de una hora, según ProColombia. Forma parte del Parque Nacional Natural Corales del Rosario y de San Bernardo, que protege arrecifes y ecosistemas marinos.'
    ], [
        'The archipelago has about 28 islands and is roughly an hour away by boat, according to ProColombia. It is part of the Corales del Rosario y de San Bernardo National Natural Park, which protects reefs and marine ecosystems.'
    ]),
    'significance': bi('Naturaleza protegida del Caribe colombiano.', 'Protected nature of the Colombian Caribbean.'),
    'status': bi('Área protegida con actividades turísticas reguladas.', 'Protected area with regulated tourism.'),
    'visit': {'es': 'Cerca de una hora en lancha. Usa operadores autorizados, no toques los corales y lleva protector solar respetuoso con el arrecife.', 'en': 'About an hour by boat. Use licensed operators, don’t touch the coral and bring reef-safe sunscreen.', 'checked': '2026-09-26', 'source': 'procolombia-playas'},
    'events': [], 'sources': ['procolombia-playas', 'pnn-rosario'], 'certainty': 'documentado', 'audio': bi(None, None), 'tourism': True,
    'photos': [
        ph(35211383, 'Juan Coronel', 'Vista aérea de una playa soleada en Bolívar con vegetación', 'Aerial view of a sunny beach in Bolívar with greenery',
           'Aguas del Caribe en Bolívar (imagen ilustrativa)', 'Caribbean waters in Bolívar (illustrative)', False),
    ]
  },
]
ids = {p['id'] for p in places}
places += [p for p in new_places if p['id'] not in ids]
W('places', places)

# ---------------- Épocas: presentación visual ----------------
periods = J('periods')
for pe in periods:
    if pe['id'] == 'prehispanica':
        pe['scene'] = 'prehispanica'
    if pe['id'] == 'contemporanea':
        pe['slides'] = [
            {'pexels': 11815901, 'author': 'Kelly', 'alt': bi('El centro histórico al atardecer', 'The historic centre at sunset')},
            {'pexels': 11815929, 'author': 'Kelly', 'alt': bi('Bocagrande y la costa: aquí avanza el Gran Malecón del Mar', 'Bocagrande and the coast, where the Gran Malecón del Mar is being built')},
            {'pexels': 13806427, 'author': 'Camilo Ruiz Vasquez', 'alt': bi('La playa de Bocagrande', 'Bocagrande beach')},
            {'pexels': 35211242, 'author': 'Juan Coronel', 'alt': bi('Playas de agua turquesa en Bolívar (imagen ilustrativa)', 'Turquoise-water beaches in Bolívar (illustrative)')},
        ]
        pe['summary'] = bi('En 1984 la UNESCO declaró Patrimonio Mundial el puerto, las fortalezas y el centro histórico. Hoy la ciudad mira al mar: playas, islas y un gran malecón en obra.',
                           'In 1984 UNESCO made the port, fortresses and historic centre a World Heritage Site. Today the city looks to the sea: beaches, islands and a great seafront promenade under construction.')
        if 'malecón' not in pe['context']['es']:
            pe['context']['es'] += ' En 2015 la Armada encontró el galeón San José, hundido en 1708, y en 2025 se recuperaron sus primeros objetos. En 2026 avanzan el Gran Malecón del Mar, un paseo de 5,1 km frente a la playa, y las obras de protección costera.'
            pe['context']['en'] += ' In 2015 the Navy found the San José galleon, sunk in 1708, and in 2025 its first objects were recovered. In 2026 work continues on the Gran Malecón del Mar, a 5.1 km beachfront promenade, and on coastal protection.'
            pe['sources'] += ['wiki-wager', 'eltiempo-galeon-2025', 'metro-malecon-2026']
W('periods', periods)

# ---------------- Rutas nuevas ----------------
routes = J('routes')
new_routes = [
    {'id': 'iglesias', 'mode': 'walk', 'name': bi('Ruta de las iglesias', 'Churches trail'),
     'intro': bi('Cinco templos, cinco historias: piratas, jesuitas, un barrio popular y una bala de cañón.', 'Five churches, five stories: pirates, Jesuits, a working-class quarter and a cannonball.'),
     'stops': ['iglesia-trinidad', 'san-pedro-claver', 'catedral', 'iglesia-santo-domingo', 'iglesia-santo-toribio'], 'stopMinutes': 10},
    {'id': 'hoy', 'mode': 'mixed', 'name': bi('Cartagena hoy: mar y playas', 'Cartagena today: sea and beaches'),
     'intro': bi('De la ciudad moderna al Caribe abierto: el nuevo malecón, las playas y las islas.', 'From the modern city to the open Caribbean: the new promenade, the beaches and the islands.'),
     'stops': ['la-boquilla', 'gran-malecon', 'playas-bocagrande', 'playa-blanca', 'islas-rosario'], 'stopMinutes': 0},
]
rid = {r['id'] for r in routes}
routes += [r for r in new_routes if r['id'] not in rid]
W('routes', routes)

# ---------------- Media ----------------
media = J('media')
media['cat']['mar'] = {'pexels': 11901399, 'author': 'Cesar Ricciulli', 'alt': bi('El mar de Cartagena al atardecer', 'The sea off Cartagena at sunset')}
media['cat']['hoy'] = {'pexels': 11815929, 'author': 'Kelly', 'alt': bi('La costa moderna de Cartagena', 'Cartagena’s modern coastline')}
media['route']['iglesias'] = 29559787; media['routeAuthor']['29559787'] = 'Juan Tapias'
media['route']['hoy'] = 35211242; media['routeAuthor']['35211242'] = 'Juan Coronel'
W('media', media)

# ---------------- Insignias ----------------
badges = J('badges')
if not any(b['id'] == 'iglesias' for b in badges):
    badges.append({'id': 'iglesias', 'icon': 'iglesia', 'name': bi('Peregrino de los templos', 'Church Pilgrim'), 'desc': bi('Visita 5 iglesias.', 'Visit 5 churches.'), 'rule': {'type': 'category', 'category': 'iglesia', 'count': 5}})
    badges.append({'id': 'mar', 'icon': 'mar', 'name': bi('Lobo de mar', 'Old Sea Dog'), 'desc': bi('Descubre la historia del galeón San José.', 'Discover the story of the San José galleon.'), 'rule': {'type': 'set', 'ids': ['galeon-san-jose'], 'count': 1}})
W('badges', badges)
print('ok', len(places), 'lugares', len(events), 'eventos', len(sources), 'fuentes')
