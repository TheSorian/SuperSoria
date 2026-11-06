export function classifyProduct(name: string, brand?: string | null): string {
  const text = ` ${name} ${brand || ''} `.toLowerCase();

  // 1. Cuidado Personal, Higiene y Belleza
  if (/\b(champ[uú]s?|geles?|gel (de )?(baño|ducha|higiene|[ií]ntimo|manos)|jab[oó]n (de manos|[ií]ntimo|pastilla)|desodorantes?|dent[ií]fricos?|pastas? (de )?dientes|cepillos? (dental|dentales|dientes)|enjuagues? bucal(es)?|colutorios?|seda dental|hilo dental|papel higi[eé]nico|toallitas?|compresas?|tamp[oó]n|tampones|protegeslips?|afeita|maquinillas?|espumas? afeitar|geles? afeitar|aftershave|cremas? (facial|faciales|corporal|corporales|manos|hidratante|solares?)|lociones?|protectores? solar(es)?|solar spf|pintalabios|labiales?|b[aá]lsamos? labial(es)?|m[aá]scaras? pestañas|r[ií]mel|eyeliner|perfiladores?|coloretes?|maquillajes?|bases? maquillaje|pinta[uú]ñas|laca uñas|esmaltes? de uñas|quitaesmaltes?|tintes?|coloraci[oó]n|laca fijaci[oó]n|lacas? cabello|fijadores?|gominas?|espumas? cabello|s[eé]rum|mascarillas? (capilar|facial|pelo)|exfoliantes?|desmaquilladores?|agua micelar|algod[oó]n desmaquillante|preservativos?|lubricantes? [ií]ntimo(s)?|lentes de contacto|lentillas?|suplementos? alimenticio(s)?|col[aá]geno|antirrozaduras|antioxidantes? piel|pañales?|dodot|colgate|oral-b|sensodyne|licor del polo|pantene|h&s|head & shoulders|tresemme|fructis|elvive|gliss|gillette|wilkinson|rexona|axe|old spice|evax|ausonia|tampax|deliplus|garnier|sanex|moussel)\b/i.test(text)) {
    return 'cuidado-personal';
  }

  // 2. Limpieza y Cuidado del Hogar
  if (/\b(detergentes?|suavizantes?|lavavajillas?|friegasuelos?|fregasuelos?|limpiacristal(es)?|limpiadores?|lej[ií]as?|desengrasantes?|antical|estropajos?|bayetas?|fregonas?|quitamanchas?|insecticidas?|ambientadores?|pastillas? lavavajillas|bolsas? (de )?basura|bolsas? basura|sacos? basura|bolsas? congelaci[oó]n|bolsas? envasadora|papel cocina|papel aluminio|papel film|film transparente|papel horno|papel freidora|papel especial freidora|tapicer[ií]as|colgador(es)? wc|desinfectantes? hogar|esponjas? m[aá]gica(s)?|guantes (reutilizables|l[aá]tex|vinilo|limpieza)|abrillantadores?|desatascadores?|planchado|ropa limpia|cera suelo|finish|fairy|ariel|skip|micolor|wipp|kh-7|kh7|cillit bang|don limpio|ajax|sanicentro|frosch|sanytol|glade|air wick|vileda|scottex|colhogar|renova|albal|handy bag|bosque verde)\b/i.test(text)) {
    return 'limpieza-hogar';
  }

  // 3. Hogar, Bazar, Menaje, Tecnología y Papelería
  if (!/vasos? de arroz|vasitos? arroz|plato preparado|tortitas/i.test(text) &&
      /\b(batidoras?|tostadores?|tostadoras?|cafeteras?|hervidores?|aspiradores?|aspiradoras?|bolsa(s)? asp(irador(a)?)?|plancha(s)? |sandwicheras?|palomiteros?|freidoras?|microondas|auriculares?|altavoces?|pilas? |bombillas?|foco led|linternas?|cargadores?|cables? usb|b[aá]sculas?|termos?|sartenes?|cazos?|cazuelas?|ollas?|cuberter[ií]as?|cucharas?|tenedores?|cuchillos? de mesa|cucharillas?|platos? hondos?|platos? llanos?|ensaladeras?|tuppers?|fiambreras?|brochetas bamb[uú]|palas? de bamb[uú]|bol[ií]grafos?|rotuladores?|cuadernos?|libretas?|esparadrapos?|tijeras?|alicates?|llaves? allen|destornilladores?|martillos?|cajas? (de )?herramientas|mochilas?|velas? perfumada(s)?|paraguas|perchas?|tendederos?|candados?|anticongelante|limpiaparabrisas|televisores?|tv |smart tv|tdt |mandos? (a distancia|sony|universal)|nintendo|switch|playstation|ps5|ps4|xbox|consolas?|cartuchos? (de )?tinta|tinta hp|toner|impresoras?|usb|pen drive|pendrive|kingston|discos? duros?|tarjetas? sd|calculadoras?|teclados?|ratones?|cajas? de ordenaci[oó]n|cajas? de almacenamiento|botellas? (inox|isot[eé]rmica|vidrio|cristal|reutilizable)|bols? biodegradables?|palillos de madera|papel de regalo|bolsas? (de )?papel|briquetas?|carb[oó]n vegetal)\b/i.test(text)) {
    return 'hogar-bazar';
  }

  // 4. Mascotas
  if (/\b(perros?|gatos?|mascotas?|pienso(s)? (para|perro|gato)|comida h[uú]meda gato|arenas? para gatos?|arena aglomerante|snacks? perro|huesos? perro|antiparasitarios?|whiskas|brekkies|purina|felix|friskies|pedigree|ultima)\b/i.test(text)) {
    return 'mascotas';
  }

  // 5. Bebidas, Refrescos y Cervezas (evaluado ANTES de frutas y dulces para que Fanta limón o Aquarius naranja sean bebidas)
  if (/\b(aguas? mineral(es)?|agua con gas|refrescos?|coca-cola|cocacola|pepsi|fanta|aquarius|nestea|sprite|t[oó]nicas?|schweppes|seven up|7up|monster energy|red bull|bebidas? energ[eé]tica(s)?|bebidas? isot[oó]nica(s)?|powerade|zumos?|n[eé]ctar(es)?|cervezas?|radler|shandy|sif[oó]n|bitter|gaseosas?|kas |trina)\b/i.test(text)) {
    return 'bebidas-refrescos';
  }

  // 6. Aceite, Vinagre, Especias y Salsas (evaluado ANTES de vino y frutas)
  if (/\b(aceites?|aove|oliva virgen|aceites? girasol|vinagres?|sal (fina|gruesa|marina|de ajo|yodada)|sales? de baño|pimientas?|or[eé]ganos?|azafr[aá]n|piment[oó]n|curry|cominos?|perejil seco|ajo en polvo|especias?|sazonadores?|salsas?|mayonesas?|mahonesas?|ketchups?|mostazas?|alioli|guacamole|pesto|salsa de soja|salsa c[eé]sar|salsa barbacoa|salsa burger|salsa miel|tabasco|aceitunas?|olivas?|encurtidos?|pepinillos?|alcaparras?|banderillas?)\b/i.test(text)) {
    return 'aceite-especias-salsas';
  }

  // 7. Bodega, Vinos y Licores (excluyendo vinagre)
  if (!/vinagre/i.test(text) &&
      /\b(vinos? tintos?|vinos? blancos?|vinos? rosados?|ribera del duero|rioja|rueda|albariño|cavas?|champagne|vermut|vermouth|sangr[ií]as?|tinto de verano|ginebras?|gins?|ron(es)? |whiskys?|whiskeys?|vodkas?|licor(es)?|an[ií]s|orujo|pachar[aá]n|tequilas?|coñac|brandy|sidras?)\b/i.test(text)) {
    return 'bodega-vinos';
  }

  // 8. Congelados
  if (/\b(congelad|helados?|polos? |cubitos de hielo|hielos? bolsa|pizzas? congelada(s)?|verduras? congelada(s)?|guisantes? congelados?|croquetas? congeladas?|pescados? congelados?|frigo|cornetto|magnum|h[aä]agen-dazs)\b/i.test(text)) {
    return 'congelados';
  }

  // 9. Conservas y Platos Preparados (excluyendo legumbres secas)
  if (/\b(conservas?|en lata|latas? de|at[uú]n claro en|sardinas? en|mejillones? en|berberechos? al natural|caballa en|esp[aá]rragos? blancos?|alcachofas? en|pimientos? del piquillo|tomate triturado|caldos? natural(es)?|caldo aneto|caldo pollo|sopas? (de sobre|maravilla|hogareña)|cremas? de verduras?|fabadas? asturiana(s)?|cocidos? (bote|frasco)|alubias? cocidas?|garbanzos? cocidos?|lentejas? cocidas?|platos? preparados?|carretilla|lasañas? preparada(s)?|canelones? preparados?|pat[eé]s?|foie)\b/i.test(text)) {
    return 'conservas-comidas';
  }

  // 10. Pescadería y Marisco fresco
  if (/\b(pescados?|merluzas?|salm[oó]n(es)?|bacalaos?|at[uú]n fresco|bonito del norte fresco|doradas?|lubinas?|corvinas?|pescadillas?|rodaballos?|sardinas? fresca(s)?|boquerones?|truchas?|gambas?|langostinos?|cigalas?|bogavantes?|almejas?|mejillones?|mejill[oó]n|berberechos? frescos?|calamares?|chipirones?|sepias?|pulpos?|gulas?|anguriñas?|surimi|palitos? de mar|muslitos? de mar|rabas?|rabas enharinadas|aguinamar)\b/i.test(text)) {
    return 'pescaderia';
  }

  // 11. Carnicería y Charcutería
  if (/\b(carnes?|terneras?|vacunos?|vacas?|morcillos?|jarretes?|chulet[oó]n(es)?|entrecots?|solomillos?|buey|cerdos?|lomos?|costillas?|pancetas?|torreznos?|chistorras?|chorizos?|salchichones?|fuet|longanizas?|morcillas?|butifarras?|jam[oó]n(es)?|paletas?|cecinas?|lac[oó]n|salchichas?|frankfurts?|hamburguesas?|burger meat|pollos?|pechugas?|muslos?|alitas pollo|pavos?|conejos?|corderos?|cabritos?|cochinillos?|codornices?|chopped|mortadelas?|sobrasadas?|chicharrones?|bacon)\b/i.test(text)) {
    return 'carniceria-charcuteria';
  }

  // 12. Huevos, Leche y Lácteos
  if (/\b(leches?|huevos?|quesos?|mozzarellas?|burratas?|burratinas?|parmesanos?|gouda|edam|roquefort|rulo cabra|quesos? frescos?|burgos|yogur(t)?(es)?|danone|activia|mantequillas?|margarinas?|natas? (para|montar|cocinar)|cuajadas?|k[eé]fir|petit suisse|arroz con leche|flanes?|natillas?|bebidas? de avena|bebidas? de soja|bebidas? de almendra|bebidas? vegetales?|tofu)\b/i.test(text)) {
    return 'lacteos-huevos';
  }

  // 13. Panadería, Pastelería y Bollería
  if (/\b(pan(es)? |barras? (de )?pan|baguettes?|hogazas?|chapatas?|picos?|colines|regañ[aá]s|biscotes?|tostadas?|pan tostado|pan de molde|pan burger|pan hamburguesa|pan perrito|croissants?|cruasanes?|magdalenas?|muffins?|boller[ií]as?|donuts?|bizcochos?|palmeras? de hojaldre|napolitanas?|ensaimadas?|tartas? |pasteles?|empanadas?|masas? (de )?(hojaldre|quebrada|pizza|empanada)|harinas?|levaduras?)\b/i.test(text)) {
    return 'panaderia-pasteleria';
  }

  // 14. Café, Desayuno, Dulces y Snacks
  if (/\b(caf[eé]s?|descafeinados?|c[aá]psulas cafe|nespresso|dolce gusto|cacao|colacao|nesquik|infusi[oó]n|infusiones|t[eé] |t[eé]s |t[eé] verde|manzanillas?|menta poleo|rooibos|cereales?|chocapic|corn flakes|muesli|avena copos|galletas?|cookies?|chocolates?|cacao puro|bomb[oó]n|bombones|nocilla|nutella|miel(es)?|mermeladas?|confituras?|az[uú]car(es)?|sacarinas?|edulcorantes?|caramelos?|golosinas?|gominolas?|regaliz|chicles?|turr[oó]n(es)?|polvorones?|mantecados?|mazap[aá]n(es)?|peladillas?|frutos secos|cacahuetes?|pistachos?|almendras?|avellanas?|nueces?|patatas? fritas?|doritos|lay'?s|pringles|snacks?|grefusa|palomitas?|nachos?|tortilla chips)\b/i.test(text)) {
    return 'desayuno-dulces';
  }

  // 15. Frutas y Verduras Frescas
  if (/\b(pl[aá]tanos?|bananas?|manzanas?|naranjas?|mandarinas?|limones?|lim[oó]n|peras?|fresas?|fresones?|melocotones?|nectarinas?|albaricoques?|cerezas?|uvas?|melones?|sand[ií]as?|piñas?|kiwis?|mangos?|aguacates?|frambuesas?|ar[aá]ndanos?|tomates?|lechugas?|ensaladas?|espinacas?|acelgas?|zanahorias?|patatas?|cebollas?|ajos?|calabacines?|calabazas?|berenjenas?|pepinos?|pimientos? frescos?|pimientos? verdes?|pimientos? rojos?|alcachofas?|esp[aá]rragos? verdes?|br[oó]coli|coliflores?|repollos?|puerros?|apios?|perejil fresco|cilantros?)\b/i.test(text)) {
    return 'frutas-verduras';
  }

  // 16. Pasta, Arroz y Legumbres (Despensa seca)
  if (!/pasta de dientes|cepillo|bals[aá]mico/i.test(text) &&
      /\b(arroz|arroces|vasitos? (de )?arroz|pastas?|macarrones?|espaguetis?|spaghettis?|fideos?|fideu[aá]s?|tallarines?|penne|fusilli|tortiglioni|rigatoni|raviolis?|tortellinis?|ñoquis|lentejas?|garbanzos?|alubias?|jud[ií]as secas|fabes|cusc[uú]s|quinoa|semolas?|s[eé]molas?)\b/i.test(text)) {
    return 'despensa-legumbres-arroz';
  }

  return 'despensa-legumbres-arroz';
}
