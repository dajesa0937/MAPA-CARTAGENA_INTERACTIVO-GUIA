"""v6 — «Cartagena para el viajero»: historias Washington/Mount Vernon y García Márquez,
dos lugares nuevos (claustro de La Merced, antiguo convento de Santa Clara) y datos
prácticos verificados (trip.json). Idempotente: se puede ejecutar varias veces."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[1] / 'site' / 'data'
J = lambda n: json.loads((root / f'{n}.json').read_text(encoding='utf-8'))
def W(n, obj): (root / f'{n}.json').write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def upsert(lst, item, after=None):
    ids = [x['id'] for x in lst]
    if item['id'] in ids: lst[ids.index(item['id'])] = item; return
    if after and after in ids: lst.insert(ids.index(after) + 1, item)
    else: lst.append(item)
B = lambda es, en: {'es': es, 'en': en}

# ---------------- Fuentes ----------------
sources = J('sources')
NEW_SOURCES = [
  dict(id='mv-lawrence', type='oficial', org="George Washington's Mount Vernon (Mount Vernon Ladies' Association)", title='Lawrence Washington — Digital Encyclopedia (Kiera E. Nolan)', url='https://www.mountvernon.org/library/digitalhistory/digital-encyclopedia/article/lawrence-washington'),
  dict(id='mv-10facts', type='oficial', org="George Washington's Mount Vernon", title="10 Facts About George Washington's Mount Vernon", url='https://www.mountvernon.org/the-estate-gardens/10-facts-about-george-washingtons-mount-vernon'),
  dict(id='mv-owners', type='oficial', org="George Washington's Mount Vernon", title='Owners of Mount Vernon', url='https://www.mountvernon.org/the-estate-gardens/the-mansion/owners-of-mount-vernon'),
  dict(id='united-ctg-2026', type='medio', org='United Airlines (comunicado vía PR Newswire, 29/06/2026)', title='United Announces New Nonstop Flights from Houston and Washington, D.C. to Cartagena', url='https://www.prnewswire.com/news-releases/united-announces-new-nonstop-flights-from-houston-and-washington-dc-to-cartagena-302813361.html'),
  dict(id='flightconnections-ctg', type='secundaria', org='FlightConnections (consultado el 27/09/2026)', title='Flights to Cartagena (CTG) — rutas directas', url='https://www.flightconnections.com/flights-to-cartagena-ctg'),
  dict(id='migracion-checkmig', type='oficial', org='Migración Colombia', title='Check-MIG: pre-registro migratorio gratuito', url='https://www.migracioncolombia.gov.co/tramites-y-servicios/aplicativos/checkmig'),
  dict(id='cancilleria-visa', type='oficial', org='Cancillería de Colombia', title='Tipos de visa y exenciones', url='https://www.cancilleria.gov.co/tramites_servicios/visa/requisitos'),
  dict(id='infobae-visa-eeuu-2025', type='medio', org='Infobae (20/04/2025), citando a la Cancillería', title='Tiempo máximo que puede quedarse un ciudadano estadounidense en Colombia', url='https://www.infobae.com/colombia/2025/04/20/este-es-el-tiempo-maximo-que-puede-quedarse-un-ciudadano-estadounidense-en-colombia-segun-la-cancilleria/'),
  dict(id='state-colombia', type='oficial', org='U.S. Department of State', title='Colombia Travel Advisory', url='https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/colombia-travel-advisory.html'),
  dict(id='clima-ctg', type='secundaria', org='Climates to Travel', title='Cartagena climate: when to go, monthly averages', url='https://www.climatestotravel.com/climate/colombia/cartagena'),
  dict(id='enchufes-co', type='secundaria', org='Power Plugs & Sockets of the World', title='Colombia — tipos de enchufe y voltaje', url='https://www.power-plugs-sockets.com/us/colombia/'),
  dict(id='wiki-hora-co', type='secundaria', org='Wikipedia', title='Time in Colombia', url='https://en.wikipedia.org/wiki/Time_in_Colombia'),
  dict(id='open-meteo', type='secundaria', org='Open-Meteo.com (CC BY 4.0)', title='Datos meteorológicos en vivo', url='https://open-meteo.com/'),
  dict(id='eluniversal-gabo-1948', type='medio', org='El Universal (Cartagena), 20/03/2015', title='Lo primero que escribió Gabo en El Universal', url='https://www.eluniversal.com.co/cultural/2015/03/20/lo-primero-que-escribio-gabo-en-el-universal/'),
  dict(id='centrogabo-bio', type='oficial', org='Centro Gabo (Fundación Gabo)', title='¿Quién fue Gabriel García Márquez?', url='https://centrogabo.org/gabo/contemos-gabo/quien-fue-gabriel-garcia-marquez'),
  dict(id='eluniversal-gabo-cenizas-2016', type='medio', org='El Universal (Cartagena), 22/05/2016', title='Cenizas de Gabriel García Márquez ya reposan en Cartagena', url='https://www.eluniversal.com.co/cultural/2016/05/22/cenizas-de-gabriel-garcia-marquez-ya-reposan-en-cartagena/'),
  dict(id='eluniversal-merced-2016', type='medio', org='El Universal (Cartagena), 11/03/2016', title='Así fue la transformación del Claustro de La Merced para recibir cenizas de Gabo', url='https://www.eluniversal.com.co/cartagena/2016/03/11/asi-fue-la-transformacion-del-claustro-de-la-merced-para-recibir-cenizas-de-gabo/'),
  dict(id='wiki-colera', type='secundaria', org='Wikipedia', title='Love in the Time of Cholera (novela, 1985)', url='https://en.wikipedia.org/wiki/Love_in_the_Time_of_Cholera'),
  dict(id='wiki-amor-demonios', type='secundaria', org='Wikipedia', title='Of Love and Other Demons (novela, 1994)', url='https://en.wikipedia.org/wiki/Of_Love_and_Other_Demons'),
  dict(id='lanacion-santaclara', type='medio', org='La Nación (Argentina)', title='Un convento de clausura de 1600 se convirtió en el hotel emblema de Cartagena', url='https://www.lanacion.com.ar/lifestyle/un-convento-de-clausura-de-1600-se-convirtio-en-el-hotel-emblema-de-cartagena-nid2201815/'),
]
for s in NEW_SOURCES: upsert(sources, s)
W('sources', sources)

# ---------------- Acontecimientos ----------------
events = J('events')
EV = [
  dict(id='e1740-washington', year=1740, date=B('9 de junio de 1740', '9 June 1740'), period='asedios',
       title=B('Un capitán de Virginia rumbo a Cartagena', 'A Virginia captain bound for Cartagena'),
       text=B('Lawrence Washington, medio hermano mayor de George Washington, recibe el grado de capitán en una de las cuatro compañías de Virginia reclutadas para la guerra de la Oreja de Jenkins (guerra del Asiento). Con ellas se une a la expedición británica que atacará Cartagena.',
              "Lawrence Washington, George Washington's older half-brother, is commissioned captain of one of four Virginia companies raised for the War of Jenkins' Ear. With them he joins the British expedition that will attack Cartagena."),
       certainty='documentado', places=[], sources=['mv-lawrence']),
  dict(id='e1741-colonos', year=1741, date=B('marzo – mayo de 1741', 'March – May 1741'), period='asedios',
       title=B('Soldados de las Trece Colonias ante las murallas', 'Soldiers from the Thirteen Colonies at the walls'),
       text=B('En el ataque participaron unos 3.600 soldados reclutados en las colonias británicas de Norteamérica, el llamado regimiento americano de William Gooch. La fiebre amarilla, la disentería y el hambre causaron la mayor parte de sus bajas; la cifra más citada dice que solo unos 300 volvieron a casa, pero los recuentos varían según la fuente.',
              "Some 3,600 soldiers recruited in Britain's North American colonies — William Gooch's American Regiment — took part in the attack. Yellow fever, dysentery and hunger caused most of their losses; the most quoted figure says only about 300 returned home, but counts vary between sources."),
       certainty='debatido', places=['castillo-san-felipe', 'castillo-san-luis'], sources=['wiki-1741']),
  dict(id='e1741-medallas', year=1741, date=B('1741', '1741'), period='asedios',
       title=B('Medallas para una victoria que no llegó', 'Medals for a victory that never came'),
       text=B('Con las primeras noticias favorables llegadas del Caribe, en Inglaterra se acuñaron medallas que celebraban la toma de Cartagena; algunas muestran a Blas de Lezo arrodillado ante Vernon. La ciudad nunca cayó. Hoy esas medallas son piezas de colección en museos del Reino Unido y de Estados Unidos.',
              'On the first good news from the Caribbean, medals were struck in England celebrating the capture of Cartagena; some show Blas de Lezo kneeling before Vernon. The city never fell. Today those medals are collectors’ pieces in museums in the United Kingdom and the United States.'),
       certainty='documentado', places=['castillo-san-felipe'], sources=['wiki-1741']),
  dict(id='e1743-mountvernon', year=1743, date=B('hacia 1743', 'c. 1743'), period='sistema',
       title=B('Una finca en Virginia llamada Mount Vernon', 'A Virginia estate called Mount Vernon'),
       text=B('De vuelta en Virginia, Lawrence Washington rebautiza la finca familiar de Little Hunting Creek como Mount Vernon, en honor de su antiguo comandante, el almirante Edward Vernon. Lawrence muere en 1752 y la propiedad termina en manos de su medio hermano George (propietario desde 1761), el futuro primer presidente de Estados Unidos.',
              'Back in Virginia, Lawrence Washington renames the family estate at Little Hunting Creek "Mount Vernon", in honour of his old commander, Admiral Edward Vernon. Lawrence dies in 1752 and the property eventually passes to his half-brother George (owner from 1761), the future first president of the United States.'),
       certainty='documentado', places=[], sources=['mv-lawrence', 'mv-10facts', 'mv-owners']),
  dict(id='e1948-gabo', year=1948, date=B('21 de mayo de 1948', '21 May 1948'), period='sigloXX',
       title=B('García Márquez empieza a escribir en Cartagena', 'García Márquez starts writing in Cartagena'),
       text=B('Tras los disturbios de abril de 1948 en Bogotá, el joven Gabriel García Márquez llega a Cartagena. El 21 de mayo el diario El Universal publica su primera columna, «Punto y aparte», gracias al jefe de redacción Clemente Manuel Zabala. Aquí comenzó su carrera de periodista.',
              'After the April 1948 riots in Bogotá, the young Gabriel García Márquez arrives in Cartagena. On 21 May the newspaper El Universal publishes his first column, "Punto y aparte", thanks to its editor Clemente Manuel Zabala. His career as a journalist began here.'),
       certainty='documentado', places=[], sources=['eluniversal-gabo-1948', 'centrogabo-bio']),
  dict(id='e1985-colera', year=1985, date=B('1985', '1985'), period='contemporanea',
       title=B('«El amor en los tiempos del cólera»', '"Love in the Time of Cholera"'),
       text=B('García Márquez publica la novela de Florentino Ariza y Fermina Daza. La ciudad caribeña donde transcurre no tiene nombre: se considera una mezcla de Cartagena y Barranquilla.',
              'García Márquez publishes the novel of Florentino Ariza and Fermina Daza. The Caribbean city where it unfolds is never named: it is considered a blend of Cartagena and Barranquilla.'),
       certainty='consenso', places=[], sources=['wiki-colera']),
  dict(id='e1994-demonios', year=1994, date=B('1994', '1994'), period='contemporanea',
       title=B('«Del amor y otros demonios» y el convento de Santa Clara', '"Of Love and Other Demons" and the convent of Santa Clara'),
       text=B('García Márquez publica una novela ambientada en la Cartagena colonial. En el prólogo cuenta que la idea nació cuando, siendo reportero, presenció cómo se vaciaban las criptas del antiguo convento de Santa Clara y vio la cabellera larguísima de una niña. Es el relato del autor, que mezcla memoria y literatura.',
              'García Márquez publishes a novel set in colonial Cartagena. In the prologue he says the idea came when, as a young reporter, he watched the crypts of the old convent of Santa Clara being emptied and saw a girl’s extraordinarily long hair. It is the author’s own account, blending memory and fiction.'),
       certainty='tradicion', places=['santa-clara'], sources=['wiki-amor-demonios', 'lanacion-santaclara']),
  dict(id='e2016-gabo', year=2016, date=B('22 de mayo de 2016', '22 May 2016'), period='hoy',
       title=B('Las cenizas de García Márquez vuelven a Cartagena', "García Márquez's ashes return to Cartagena"),
       text=B('Las cenizas del premio Nobel (1927–2014) se depositan en el claustro de La Merced, sede de la Universidad de Cartagena, bajo un busto de bronce de la artista británica Katy Murray. Su familia eligió la ciudad donde había empezado como periodista.',
              'The ashes of the Nobel laureate (1927–2014) are laid to rest in the La Merced cloister, home of the University of Cartagena, beneath a bronze bust by British artist Katy Murray. His family chose the city where he had begun as a journalist.'),
       certainty='documentado', places=['claustro-merced'], sources=['eluniversal-gabo-cenizas-2016', 'eluniversal-merced-2016']),
]
for e in EV: upsert(events, e)
events.sort(key=lambda e: (e['year'], e['id']))
W('events', events)

# ---------------- Lugares ----------------
places = J('places')
claustro = {
  'id': 'claustro-merced', 'category': 'cultura',
  'name': B('Claustro de La Merced (Universidad de Cartagena)', 'La Merced Cloister (University of Cartagena)'),
  'aka': ['García Márquez', 'Gabo', 'Gabriel García Márquez', 'cenizas', 'busto', 'tumba', 'Universidad de Cartagena', 'La Merced', 'Nobel', 'Macondo'],
  'coords': [10.42694, -75.55102],
  'loc': {'accuracy': 'exact', 'method': 'Verificada sobre OpenStreetMap: «Gabriel García Márquez – morada final» (27/09/2026)'},
  'built': {'from': 1617, 'to': None},
  'dates': B('1617–1625 (claustro) · cenizas de García Márquez desde 2016', '1617–1625 (cloister) · García Márquez’s ashes since 2016'),
  'periods': ['amurallada', 'independencia', 'sigloXX', 'hoy'],
  'people': ['Gabriel García Márquez', 'Mercedes Barcha', 'Katy Murray'],
  'guide': B('En el patio de este claustro, junto a la plaza de La Merced, reposan desde 2016 las cenizas de Gabriel García Márquez, bajo un busto de bronce. Es el mejor punto de partida para recorrer la Cartagena del Nobel: aquí empezó como periodista en 1948.',
             'In the courtyard of this cloister, next to La Merced square, the ashes of Gabriel García Márquez have rested since 2016 beneath a bronze bust. It is the perfect starting point for exploring the Nobel laureate’s Cartagena: he began here as a journalist in 1948.'),
  'history': B([
      'Según la prensa local, la orden de La Merced levantó el claustro entre 1617 y 1625. Donde estuvo su iglesia se levanta hoy el teatro Adolfo Mejía (antes teatro Heredia), a pocos pasos.',
      'Durante la independencia lo ocuparon tropas durante casi cuatro años. Después fue Escuela Normal y Palacio de Justicia, y entre 1906 y 1911 el arquitecto Pedro Malabet lo reformó al gusto republicano. Desde los años noventa pertenece a la Universidad de Cartagena.',
      'El 22 de mayo de 2016 se depositaron aquí las cenizas de García Márquez (1927–2014). El monumento, del arquitecto Jorge Sandoval, integra un aljibe colonial hallado en las excavaciones de 2015 y un busto de bronce de la artista británica Katy Murray.'
    ], [
      'According to the local press, the Order of Mercy built the cloister between 1617 and 1625. Where its church once stood is today the Adolfo Mejía theatre (formerly the Heredia), a few steps away.',
      'During the independence era troops occupied it for almost four years. It later became a teacher-training school and the Palace of Justice, and between 1906 and 1911 architect Pedro Malabet remodelled it in Republican style. Since the 1990s it has belonged to the University of Cartagena.',
      'On 22 May 2016 García Márquez’s ashes (1927–2014) were laid to rest here. The memorial, by architect Jorge Sandoval, incorporates a colonial cistern found during the 2015 excavations and a bronze bust by British artist Katy Murray.'
    ]),
  'significance': B('Lugar de memoria de Gabriel García Márquez, premio Nobel de Literatura 1982, en la ciudad donde se hizo periodista.',
                    'The memorial of Gabriel García Márquez, 1982 Nobel laureate in Literature, in the city where he became a journalist.'),
  'status': B('Sede de la Universidad de Cartagena. Confirma el acceso al patio antes de ir.', 'University of Cartagena building. Check access to the courtyard before you go.'),
  'events': ['e2016-gabo'],
  'sources': ['eluniversal-merced-2016', 'eluniversal-gabo-cenizas-2016', 'centrogabo-bio'],
  'certainty': 'consenso', 'audio': {'es': None, 'en': None},
  'photos': [
    {'commons': 'Sepulcro de Gabriel garcía Márquez Cartagena de Indias-20240820.jpg', 'author': 'Jdvillalobos', 'license': 'CC BY-SA 4.0',
     'alt': B('Busto de García Márquez sobre su pedestal, en el patio del claustro', 'García Márquez’s bust on its pedestal in the cloister courtyard'),
     'angle': B('El monumento en 2024', 'The memorial in 2024')},
    {'commons': 'Busto de García Márquez en el Claustro La Merced Unicartagena.jpg', 'author': 'Esteban B.H.', 'license': 'CC BY-SA 4.0',
     'alt': B('El busto de bronce de García Márquez', 'The bronze bust of García Márquez'),
     'angle': B('El busto de Katy Murray', 'Katy Murray’s bust')},
  ]
}
santa = {
  'id': 'santa-clara', 'category': 'iglesia',
  'name': B('Antiguo convento de Santa Clara', 'Former Convent of Santa Clara'),
  'aka': ['Santa Clara', 'clarisas', 'Sofitel', 'hotel Santa Clara', 'convento', 'García Márquez', 'Del amor y otros demonios', 'Sierva María', 'cripta'],
  'coords': [10.42855, -75.54796],
  'loc': {'accuracy': 'exact', 'method': 'Verificada sobre OpenStreetMap (27/09/2026)'},
  'built': {'from': 1621, 'to': None},
  'dates': B('fundado en 1621 · hotel desde 1995', 'founded 1621 · hotel since 1995'),
  'periods': ['amurallada', 'asedios', 'sistema', 'independencia', 'sigloXIX', 'contemporanea', 'hoy'],
  'people': ['Gabriel García Márquez'],
  'guide': B('Tras estos muros, en el barrio de San Diego, vivieron en clausura las monjas clarisas desde el siglo XVII. García Márquez situó aquí parte de «Del amor y otros demonios». Hoy el edificio restaurado es un hotel.',
             'Behind these walls, in the San Diego quarter, the Poor Clare nuns lived in seclusion from the 17th century. García Márquez set part of "Of Love and Other Demons" here. Today the restored building is a hotel.'),
  'history': B([
      'El convento de las clarisas se fundó en 1621. A mediados del siglo XIX las monjas tuvieron que abandonarlo, y el edificio pasó por largos años de usos diversos y de abandono.',
      'En 1995 una restauración lo convirtió en hotel, que conserva el claustro y una cripta bajo el antiguo convento.',
      'En el prólogo de «Del amor y otros demonios» (1994), García Márquez cuenta que la novela nació de lo que vio como joven reportero cuando se vaciaron las criptas de Santa Clara. Es su relato: no hay otra fuente que lo confirme de forma independiente.'
    ], [
      'The Poor Clares’ convent was founded in 1621. In the mid-19th century the nuns had to leave, and the building went through long years of assorted uses and neglect.',
      'In 1995 a restoration turned it into a hotel, which keeps the cloister and a crypt beneath the former convent.',
      'In the prologue to "Of Love and Other Demons" (1994), García Márquez says the novel grew out of what he saw as a young reporter when the crypts of Santa Clara were emptied. It is his own account: no other source independently confirms it.'
    ]),
  'note': B('El episodio de las criptas procede del prólogo de la novela; lo presentamos como relato del autor.', 'The crypt episode comes from the novel’s prologue; we present it as the author’s own account.'),
  'significance': B('Uno de los conventos coloniales del centro histórico y escenario literario de García Márquez.', 'One of the colonial convents of the historic centre and a literary setting for García Márquez.'),
  'status': B('Hotel (propiedad privada). Consulta en el hotel si admite visitas.', 'Hotel (private property). Ask the hotel whether visits are allowed.'),
  'events': ['e1994-demonios'],
  'sources': ['lanacion-santaclara', 'wiki-amor-demonios'],
  'certainty': 'consenso', 'audio': {'es': None, 'en': None},
  'photos': [
    {'commons': 'Vista diagonal de la Iglesia y Convento de Santa Clara. Cartagena de Indias.JPG', 'author': 'Kamilokardona', 'license': 'CC BY-SA 3.0',
     'alt': B('Muros rojizos de la iglesia y el convento de Santa Clara', 'Reddish walls of the church and convent of Santa Clara'),
     'angle': B('La iglesia y el convento', 'The church and convent')},
    {'commons': 'Hotel Santa Clara 00.jpg', 'author': 'Xemenendura', 'license': 'CC BY-SA 4.0',
     'alt': B('Fachada del hotel instalado en el antiguo convento', 'Façade of the hotel in the former convent'),
     'angle': B('La fachada hoy', 'The façade today')},
    {'commons': 'Inside a crypt beneath the Sofitel Hotel, Cartagena, Colombia (24772452106).jpg', 'author': 'Joe Ross', 'license': 'CC BY-SA 2.0',
     'alt': B('Visitantes con velas en la cripta bajo el antiguo convento', 'Visitors with candles in the crypt beneath the former convent'),
     'angle': B('La cripta (2016)', 'The crypt (2016)')},
  ]
}
upsert(places, claustro, after='teatro-adolfo-mejia')
upsert(places, santa, after='san-pedro-claver')
for p in places:
    if p['id'] == 'teatro-adolfo-mejia':
        p['coords'] = [10.42665, -75.55114]
        p['loc'] = {'accuracy': 'exact', 'method': 'Verificada sobre OpenStreetMap (edificio «Teatro Adolfo Mejía», 27/09/2026)'}
W('places', places)

# ---------------- Historias ----------------
stories = J('stories')
C = lambda commons, author, lic, es, en: {'commons': commons, 'author': author, 'license': lic, 'alt': B(es, en)}
COVER = lambda *a: {**C(*a), 'specific': True}
washington = {
  'id': 'washington', 'accent': '#7a2e2e',
  'cover': COVER('Penning voor Admiraal Vernon voor de inname van Carthagena in 1741 en de overgave van Don Blass op één knie 1741 barcode 800000087800.jpg',
             'Edward Pinchbeck (1741) / Rijksmuseum', 'CC0',
             'Medalla británica de 1741 que celebraba una toma de Cartagena que nunca ocurrió', 'A 1741 British medal celebrating a capture of Cartagena that never happened'),
  'kicker': B('Cartagena y Estados Unidos', 'Cartagena & the United States'),
  'title': B('El nombre de Mount Vernon', 'How Mount Vernon got its name'),
  'teaser': B('La casa de George Washington se llama así por el almirante que atacó Cartagena en 1741.', "George Washington's home is named after the admiral who attacked Cartagena in 1741."),
  'intro': B('Si has visitado Mount Vernon, la casa de George Washington en Virginia, ya conoces un pedazo de esta historia. Su nombre recuerda al almirante británico Edward Vernon, que en 1741 lanzó contra Cartagena una enorme expedición naval. Entre sus soldados había miles de colonos de Norteamérica… y un capitán llamado Lawrence Washington, el hermano mayor de George.',
             "If you have visited Mount Vernon, George Washington's home in Virginia, you already know part of this story. Its name honours the British admiral Edward Vernon, who in 1741 threw a huge naval expedition against Cartagena. Among his soldiers were thousands of North American colonists… and a captain named Lawrence Washington, George's older brother."),
  'chapters': [
    {'event': 'e1740-washington', 'photo': {**C('Lawrence Washington (cropped).jpg', 'Autor desconocido (s. XVIII)', 'Dominio público', 'Retrato de Lawrence Washington', 'Portrait of Lawrence Washington'), 'angle': B('Lawrence Washington', 'Lawrence Washington')}},
    {'event': 'e1741-colonos'},
    {'event': 'e1741-vernon', 'photo': {**C('Thomas Hudson (1701-1779) - Admiral Edward Vernon (1684–1757) - R.1934-164 - Colchester and Ipswich Museums Service.jpg', 'Thomas Hudson (1739)', 'Dominio público', 'Retrato del almirante Edward Vernon', 'Portrait of Admiral Edward Vernon'), 'angle': B('El almirante Vernon', 'Admiral Vernon')}},
    {'event': 'e1741-medallas'},
    {'event': 'e1743-mountvernon', 'photo': {**C('Mount Vernon Mansion East Front.jpg', 'Otherspice', 'CC BY-SA 4.0', 'La casa de Mount Vernon, en Virginia', 'The Mount Vernon mansion in Virginia'), 'angle': B('Mount Vernon (Virginia) hoy', 'Mount Vernon, Virginia, today')}},
    {'label': B('Hoy', 'Today'), 'title': B('De Washington a Cartagena, sin escalas', 'Washington to Cartagena, nonstop'),
     'text': B('United Airlines anunció el 29 de junio de 2026 vuelos directos a Cartagena desde Washington-Dulles y desde Houston a partir del 17 de diciembre de 2026, cuatro por semana. Es información comercial: confírmala con la aerolínea.',
               'On 29 June 2026 United Airlines announced nonstop flights to Cartagena from Washington Dulles and Houston starting 17 December 2026, four a week. This is commercial information: confirm it with the airline.'),
     'certainty': 'documentado', 'sources': ['united-ctg-2026'], 'tourism': True},
  ],
  'places': ['castillo-san-felipe', 'castillo-san-luis', 'convento-popa'],
  'period': 'asedios',
  'unknown': B('No sabemos qué hizo exactamente Lawrence Washington durante el asedio ni en qué puntos combatió. Las cifras de soldados coloniales y de supervivientes varían según la fuente. Los vuelos son información comercial anunciada en 2026 y pueden cambiar.',
               'We do not know exactly what Lawrence Washington did during the siege or where he fought. Figures for colonial soldiers and survivors vary between sources. The flights are commercial information announced in 2026 and may change.'),
}
gabo = {
  'id': 'gabo', 'accent': '#a8452a',
  'cover': COVER('Busto de García Márquez en el Claustro La Merced Unicartagena.jpg', 'Esteban B.H.', 'CC BY-SA 4.0',
             'El busto de García Márquez en el claustro de La Merced', 'García Márquez’s bust in the La Merced cloister'),
  'kicker': B('Cartagena literaria', 'Literary Cartagena'),
  'title': B('La Cartagena de García Márquez', "García Márquez's Cartagena"),
  'teaser': B('El reportero que llegó en 1948 y el Nobel que volvió para quedarse.', 'The young reporter of 1948 and the Nobel laureate who came back to stay.'),
  'intro': B('Gabriel García Márquez (1927–2014), premio Nobel de Literatura en 1982, llegó a Cartagena con 21 años y aquí se hizo periodista. La ciudad amurallada asoma en algunas de sus novelas, y hoy sus cenizas reposan en el centro histórico. Esta historia separa lo documentado de lo que contó el propio autor.',
             'Gabriel García Márquez (1927–2014), winner of the 1982 Nobel Prize in Literature, arrived in Cartagena aged 21 and became a journalist here. The walled city surfaces in some of his novels, and today his ashes rest in the historic centre. This story separates what is documented from what the author himself told.'),
  'chapters': [
    {'event': 'e1948-gabo', 'photo': {**C('Gabriel Garcia Marquez, 2009.jpg', 'Festival Internacional de Cine en Guadalajara', 'CC BY 2.0', 'Gabriel García Márquez en 2009', 'Gabriel García Márquez in 2009'), 'angle': B('García Márquez en 2009', 'García Márquez in 2009')}},
    {'event': 'e1985-colera'},
    {'event': 'e1994-demonios'},
    {'event': 'e2016-gabo'},
  ],
  'places': ['claustro-merced', 'santa-clara', 'teatro-adolfo-mejia'],
  'unknown': B('El episodio de las criptas de Santa Clara procede del prólogo de «Del amor y otros demonios»: es el relato del autor. La ciudad de «El amor en los tiempos del cólera» no tiene nombre; se la considera una mezcla de Cartagena y Barranquilla.',
               'The Santa Clara crypt episode comes from the prologue to "Of Love and Other Demons": it is the author’s own account. The city in "Love in the Time of Cholera" is never named; it is considered a blend of Cartagena and Barranquilla.'),
}
upsert(stories, washington, after='galeon')
upsert(stories, gabo, after='inquisicion')
W('stories', stories)

# ---------------- Insignias ----------------
badges = J('badges')
for b in badges:
    if b['id'] == 'historiador' or b.get('rule', {}).get('type') != 'set': continue
    if b['id'] == 'centro':
        for pid in ['claustro-merced', 'santa-clara']:
            if pid not in b['rule']['ids']: b['rule']['ids'].append(pid)
W('badges', badges)
print('ok', len(sources), 'fuentes ·', len(events), 'eventos ·', len(places), 'lugares ·', len(stories), 'historias')
