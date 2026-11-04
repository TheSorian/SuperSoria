export function mapToCategoryId(name: string, categoryHint?: string | null): string {
  const combined = `${name} ${categoryHint || ''}`.toLowerCase();

  if (/plátano|banana|manzana|naranja|limón|pera|fresa|tomate|lechuga|patata|cebolla|zanahoria|verdura|fruta|aguacate|calabac/i.test(combined)) {
    return 'frutas-verduras';
  }
  if (/pan |barra |baguette|croissant|boller|tostada|galleta|magdalena|pastel|empanada|harina/i.test(combined)) {
    return 'panaderia-pasteleria';
  }
  if (/carne|pollo|ternera|cerdo|lomo|salchicha|hamburguesa|jamón|pavo|chorizo|torrezno|fuet|embutido|bacon|panceta/i.test(combined)) {
    return 'carniceria-charcuteria';
  }
  if (/pescado|salmón|merluza|atún|dorada|lubina|gambas|langostino|mejill|bacalao|calamar|pulpo/i.test(combined)) {
    return 'pescaderia';
  }
  if (/leche|huevo|queso|yogur|mantequilla|nata|cuajada|kefir/i.test(combined)) {
    return 'lacteos-huevos';
  }
  if (/aceite|oliva|girasol|vinagre|sal |especias|pimienta|orégano|mayonesa|ketchup|mostaza|salsa/i.test(combined)) {
    return 'aceite-especias-salsas';
  }
  if (/pasta|macarron|espagueti|arroz|lenteja|garbanzo|alubia|fideo/i.test(combined)) {
    return 'despensa-legumbres-arroz';
  }
  if (/café|cacao|colacao|nesquik|cereales|chocolat|miel|mermelada|azúcar/i.test(combined)) {
    return 'desayuno-dulces';
  }
  if (/atún en lata|sardina|conserva|espárrago|tomate frito|fabada|lentejas preparadas/i.test(combined)) {
    return 'conservas-comidas';
  }
  if (/agua|coca-cola|fanta|refresco|zumo|cerveza|tonica|aquarius/i.test(combined)) {
    return 'bebidas-refrescos';
  }
  if (/vino|ribera|rioja|duero|cerveza artesana|ginebra|ron|whisky|licor/i.test(combined)) {
    return 'bodega-vinos';
  }
  if (/congelado|helado|guisantes congelados|pizza/i.test(combined)) {
    return 'congelados';
  }
  if (/detergente|suavizante|lavavajillas|lejía|fregasuelos|papel higiénico|servilleta|fregona|estropajo/i.test(combined)) {
    return 'limpieza-hogar';
  }
  if (/champú|gel de ducha|desodorante|pasta de dientes|cepillo|colonia|crema/i.test(combined)) {
    return 'cuidado-personal';
  }
  if (/perro|gato|mascota|pienso/i.test(combined)) {
    return 'mascotas';
  }

  return 'despensa-legumbres-arroz'; // Default fallback
}
