import styles from "./spanish-reading-preview.module.css";

const paragraphs = [
  'Cada sábado, el patio de un instituto de Zaragoza se transforma en un taller de reparación. Allí no se venden productos nuevos: se intenta dar una segunda vida a los que ya existen. La iniciativa, llamada «Otra oportunidad», nació cuando Lucía, una alumna de diecisiete años, vio una tostadora casi nueva junto a los contenedores. «No sabía arreglarla, pero me pregunté cuántas cosas tiramos simplemente porque nadie nos ha enseñado a repararlas», recuerda.',
  'Al principio, Lucía publicó un anuncio en las redes sociales del barrio. Esperaba reunir a unos cuantos compañeros, pero también se apuntaron personas jubiladas con experiencia en electricidad y costura. El instituto prestó el patio y una ferretería donó herramientas. Los participantes no pagan por la ayuda; solo compran las piezas que necesitan. Además, deben quedarse durante la reparación: el objetivo no es ofrecer un servicio rápido, sino compartir conocimientos.',
  'La colaboración funciona en las dos direcciones. Carmen, una antigua modista, enseña a cambiar cremalleras, mientras que los jóvenes le explican cómo organizar sus fotografías digitales. «Pensaba que vendría a enseñar, pero estoy aprendiendo tanto como ellos», comenta. Para Lucía, estas conversaciones son tan importantes como los objetos reparados. Muchas personas viven en la misma calle desde hace años sin haberse hablado nunca.',
  'Sin embargo, no todo se puede recuperar. Algunos aparatos están diseñados de manera que abrirlos resulta casi imposible; en otros casos, una pieza cuesta más que un producto nuevo. Por seguridad, el grupo no acepta baterías dañadas ni aparatos que requieran conocimientos que ninguno de sus miembros posee. Cuando no pueden reparar algo, explican dónde llevarlo para reciclarlo correctamente. Reconocer esos límites también forma parte del aprendizaje.',
  'Tras seis meses, el equipo ha decidido no medir el éxito únicamente por el número de objetos salvados. Ahora pregunta a los participantes si han intentado hacer alguna reparación por su cuenta. Lucía no pretende que todo el mundo se convierta en especialista. Quiere que, antes de comprar, nos detengamos a pensar. «La mejor herramienta que podemos llevarnos de aquí no cabe en una caja: es la confianza para intentarlo», afirma.'
];
const questions = [
  { text: '¿Qué hecho concreto inspiró a Lucía para crear la iniciativa? (Párrafo 1)', marks: 1, answer: 'Vio una tostadora casi nueva junto a los contenedores.' },
  { text: 'Indica dos formas de apoyo material que recibió el proyecto. (Párrafo 2)', marks: 2, answer: 'El instituto prestó el patio (1) y una ferretería donó herramientas (1).' },
  { text: '¿Por qué deben quedarse los participantes durante la reparación? (Párrafo 2)', marks: 1, answer: 'Para aprender / compartir conocimientos, en vez de limitarse a recibir un servicio.' },
  { text: 'Verdadero o falso: Carmen solo participa para enseñar. Justifica tu respuesta con palabras del texto. (Párrafo 3)', marks: 2, answer: 'Falso (1). «Estoy aprendiendo tanto como ellos» (1). Se requieren la decisión y la justificación.' },
  { text: 'Busca en el párrafo 4 una palabra que signifique «estropeadas».', marks: 1, answer: 'Dañadas.' },
  { text: 'Indica dos obstáculos que dificultan reparar algunos aparatos. (Párrafo 4)', marks: 2, answer: 'El diseño hace que abrirlos sea casi imposible (1); una pieza puede costar más que un producto nuevo (1).' },
  { text: '¿Qué quiere saber ahora el equipo para evaluar el éxito del proyecto? (Párrafo 5)', marks: 1, answer: 'Si los participantes han intentado hacer alguna reparación por su cuenta.' },
  { text: 'En la última frase, ¿a qué se refiere Lucía con «la mejor herramienta»?', marks: 1, answer: 'A la confianza para intentar reparar algo.' },
];

export function SpanishReadingPreview() {
  return <section lang="es" className={styles.demo} id="spanish-preview" aria-labelledby="spanish-title">
    <div className={styles.wrap}>
      <div className={styles.top}><span>VISTA PREVIA · ESPAÑOL B</span><span>Comprensión de lectura · Prueba 2</span></div>
      <div className={styles.intro}>
        <div><p className={styles.eyebrow}>Leer. Comprender. Conectar.</p><h2 id="spanish-title">Una segunda vida para las cosas</h2><p>Una lectura, ocho preguntas y una nueva perspectiva sobre lo que tiramos.</p></div>
        <div className={styles.meta}><strong>20 min</strong><span>Tiempo sugerido</span><strong>11 puntos</strong><span>Actividad de muestra</span></div>
      </div>
      <p className={styles.note}>Texto original de ficción para practicar. Muestra inspirada en la comprensión de lectura de Español B; no es un examen oficial del IB ni una prueba completa. Las respuestas escritas aquí son temporales.</p>
      <div className={styles.columns}>
        <article className={styles.reading}><div className={styles.panelTitle}><span>TEXTO A</span><span>Organización social · Comunidad</span></div><h3>El taller donde todos tienen algo que enseñar</h3><p className={styles.byline}>Artículo de revista · Texto original</p>{paragraphs.map((p, i) => <div className={styles.paragraph} key={p}><span aria-label={`Párrafo ${i+1}`}>{i+1}</span><p>{p}</p></div>)}</article>
        <div className={styles.questions}><div className={styles.panelTitle}><span>ACTIVIDADES</span><span>8 preguntas</span></div><h3>Demuestra lo que has comprendido</h3><p>Responde en español. Basa tus respuestas en el texto.</p>{questions.map((q,i)=><div className={styles.question} key={q.text}><label htmlFor={`spanish-answer-${i}`}><span className={styles.number}>{i+1}</span><span>{q.text} <small>[{q.marks} {q.marks===1?'punto':'puntos'}]</small></span></label><textarea id={`spanish-answer-${i}`} rows={2} placeholder="Escribe tu respuesta…" /></div>)}
          <details className={styles.key}><summary>Ver respuestas orientativas · Profesorado</summary><p>Se aceptan formulaciones equivalentes que expresen la misma idea. Total: 11 puntos. Esta muestra no asigna una nota del IB.</p><ol>{questions.map(q=><li key={q.text}>{q.answer}</li>)}</ol></details>
        </div>
      </div>
    </div>
  </section>;
}
