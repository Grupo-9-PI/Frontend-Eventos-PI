import re

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    app_code = f.read()

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css', 'r', encoding='utf-8') as f:
    css_code = f.read()

# 1. Update CSS to fix the checkbox!
if 'url("data:image/svg+xml' not in css_code:
    css_code = css_code.replace('.task-check:checked::after {', '.task-check:checked::after { display: none; }\n.task-check:checked { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23162019\' stroke-width=\'4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'20 6 9 17 4 12\'%3E%3C/polyline%3E%3C/svg%3E"); background-size: 70%; background-position: center; background-repeat: no-repeat; }\n.task-check-old::after {')

# 2. Add Progreso page in App.tsx
old_progreso = "function Progreso() { return <div><Encabezado eyebrow='Progreso' titulo='Métricas' /></div>; }"
new_progreso = """function Progreso() {
  const { eventos } = useStore();
  if (!eventos.length) return <div><Encabezado eyebrow='Progreso' titulo='Métricas' /><EmptyState titulo='Sin datos' copy='Aún no hay eventos registrados.' /></div>;

  const totalEventos = eventos.length;
  const eventosCompletados = eventos.filter(e => e.subtareas.length > 0 && e.subtareas.every(t => t.estado === 'hecho')).length;
  const eventosActivos = totalEventos - eventosCompletados;

  const todasTareas = eventos.flatMap(e => e.subtareas);
  const totalTareas = todasTareas.length;
  const tareasCompletadas = todasTareas.filter(t => t.estado === 'hecho').length;
  
  const porcentajeGlobal = totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100);

  return (
    <div>
      <Encabezado eyebrow='Progreso' titulo='Métricas globales' />
      <div className='detail-layout' style={{ marginTop: '32px' }}>
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
             <div className='card card-pad' style={{ background: 'rgba(111,174,134,0.06)', borderColor: 'rgba(111,174,134,0.2)' }}>
               <div style={{ color: 'var(--salvia)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Progreso Global</div>
               <div style={{ fontSize: '42px', color: 'var(--salvia)', fontWeight: 300 }}>{porcentajeGlobal}%</div>
             </div>
             <div className='card card-pad'>
               <div style={{ color: 'var(--apagado)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Eventos Activos</div>
               <div style={{ fontSize: '42px', color: '#fff', fontWeight: 300 }}>{eventosActivos} <span style={{ fontSize: '16px', color: '#555' }}>/ {totalEventos}</span></div>
             </div>
             <div className='card card-pad'>
               <div style={{ color: 'var(--apagado)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Gestiones Completadas</div>
               <div style={{ fontSize: '42px', color: '#fff', fontWeight: 300 }}>{tareasCompletadas} <span style={{ fontSize: '16px', color: '#555' }}>/ {totalTareas}</span></div>
             </div>
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 500, color: '#e0e0e0' }}>Desglose por Evento</h3>
          <div className='task-list'>
            {eventos.map(e => {
               const p = calcularPorcentaje(e);
               return (
                 <Link href={'/evento/' + e.id} key={e.id} className='task-row' style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '16px 20px', cursor: 'pointer', textDecoration: 'none' }}>
                   <div>
                     <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: '#fff' }}>{e.nombre}</div>
                     <div style={{ fontSize: '13px', color: 'var(--apagado)' }}>{e.subtareas.filter(t => t.estado === 'hecho').length} de {e.subtareas.length} gestiones completadas</div>
                   </div>
                   <div style={{ fontSize: '24px', color: p === 100 ? 'var(--salvia)' : '#e0e0e0', fontWeight: 300 }}>{p}%</div>
                 </Link>
               )
            })}
          </div>
        </section>
      </div>
    </div>
  );
}"""

app_code = app_code.replace(old_progreso, new_progreso)

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css', 'w', encoding='utf-8') as f:
    f.write(css_code)

print("Updated Progreso and Checkbox")
