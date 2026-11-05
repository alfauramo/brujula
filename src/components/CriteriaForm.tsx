import type { Criteria, OrgType, Seniority, WorkMode } from '../types';
import { ORG_LABEL, SENIORITY_LABEL, WORK_MODE_LABEL } from '../lib/labels';
import { packById } from '../data/packs';
import { Icon, Switch, TagInput } from './ui';

const ORG_CHOICES: OrgType[] = [
  'asociacion',
  'fundacion',
  'sanitario',
  'educativo',
  'publico',
  'empresa',
];

const MODES: WorkMode[] = ['onsite', 'hybrid', 'remote'];

const LOCATION_SUGGESTIONS = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Málaga',
  'Bilbao',
  'Zaragoza',
  'Remoto',
];

export function CriteriaForm({
  value,
  onChange,
  showSector = true,
}: {
  value: Criteria;
  onChange: (next: Criteria) => void;
  showSector?: boolean;
}) {
  const pack = packById(value.sectorPack);
  const set = <K extends keyof Criteria>(key: K, next: Criteria[K]) => onChange({ ...value, [key]: next });
  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  return (
    <div className="criteria-form">
      {showSector && (
        <section className="form-section">
          <div className="section-heading">
            <h3>Sector</h3>
            <p>Las plantillas rellenan roles, palabras clave y portales recomendados.</p>
          </div>
          <div className="pack-grid">
            {(['psicologia', 'tecnologia', 'general'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={`pack-card${value.sectorPack === id ? ' is-active' : ''}`}
                onClick={() => set('sectorPack', id)}
                aria-pressed={value.sectorPack === id}
              >
                <strong>{packById(id).label}</strong>
                <span>{packById(id).tagline}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              onChange({
                ...value,
                roles: pack.roles.slice(0, 3),
                keywords: pack.keywords.slice(0, 6),
                orgTypes: pack.orgTypes,
              })
            }
          >
            <Icon name="refresh" size={14} /> Aplicar plantilla de {pack.label.toLowerCase()}
          </button>
        </section>
      )}

      <section className="form-section">
        <div className="section-heading">
          <h3>Qué puestos buscas</h3>
          <p>Escribe uno o varios. Pulsa Enter para añadir.</p>
        </div>
        <label className="field">
          <span>Puestos o roles</span>
          <TagInput
            values={value.roles}
            onChange={(roles) => set('roles', roles)}
            placeholder="Ej. psicólogo/a sanitario/a"
            suggestions={pack.roles}
            ariaLabel="Roles que buscas"
          />
        </label>
        <label className="field">
          <span>Palabras clave de la oferta</span>
          <TagInput
            values={value.keywords}
            onChange={(keywords) => set('keywords', keywords)}
            placeholder="Ej. salud mental, intervención, terapia"
            suggestions={pack.keywords}
            ariaLabel="Palabras clave"
          />
        </label>
        <label className="field">
          <span>Requisitos imprescindibles <em>(si no aparecen, la oferta baja mucho)</em></span>
          <TagInput
            values={value.mustHave}
            onChange={(mustHave) => set('mustHave', mustHave)}
            placeholder="Ej. colegiación, máster sanitario"
            ariaLabel="Requisitos imprescindibles"
          />
        </label>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <h3>Dónde y cómo</h3>
          <p>Si dejas la ubicación vacía, se tienen en cuenta todas.</p>
        </div>
        <label className="field">
          <span>Ubicaciones</span>
          <TagInput
            values={value.locations}
            onChange={(locations) => set('locations', locations)}
            placeholder="Ej. Madrid, Valencia, Remoto"
            suggestions={LOCATION_SUGGESTIONS}
            ariaLabel="Ubicaciones"
          />
        </label>
        <fieldset className="field">
          <legend>Modalidad</legend>
          <div className="choice-row">
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`choice${value.workModes.includes(mode) ? ' is-active' : ''}`}
                aria-pressed={value.workModes.includes(mode)}
                onClick={() => set('workModes', toggle(value.workModes, mode))}
              >
                {WORK_MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>Tipo de entidad</legend>
          <div className="choice-row">
            {ORG_CHOICES.map((org) => (
              <button
                key={org}
                type="button"
                className={`choice${value.orgTypes.includes(org) ? ' is-active' : ''}`}
                aria-pressed={value.orgTypes.includes(org)}
                onClick={() => set('orgTypes', toggle(value.orgTypes, org))}
              >
                {ORG_LABEL[org]}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Marca asociaciones y fundaciones si te interesa el tercer sector, además de la empresa privada.
          </p>
        </fieldset>
        <div className="field-grid">
          <label className="field">
            <span>Nivel</span>
            <select
              value={value.seniority}
              onChange={(event) => set('seniority', event.target.value as Seniority)}
            >
              {(Object.keys(SENIORITY_LABEL) as Seniority[]).map((level) => (
                <option key={level} value={level}>{SENIORITY_LABEL[level]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Antigüedad máxima</span>
            <select
              value={value.maxAgeDays}
              onChange={(event) => set('maxAgeDays', Number(event.target.value))}
            >
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={45}>45 días</option>
              <option value={90}>90 días</option>
            </select>
          </label>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Salario mínimo anual <em>(opcional)</em></span>
            <input
              type="number"
              min={0}
              step={1000}
              value={value.minSalary ?? ''}
              placeholder="Ej. 24000"
              onChange={(event) =>
                set('minSalary', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </label>
          <label className="field">
            <span>Moneda</span>
            <select
              value={value.currency}
              onChange={(event) => set('currency', event.target.value as Criteria['currency'])}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <h3>Qué descartar</h3>
          <p>Estas ofertas desaparecen de la lista sin que tengas que revisarlas.</p>
        </div>
        <label className="field">
          <span>Palabras excluidas</span>
          <TagInput
            values={value.exclude}
            onChange={(exclude) => set('exclude', exclude)}
            placeholder="Ej. teleoperador, comisiones, venta"
            ariaLabel="Palabras excluidas"
          />
        </label>
        <label className="field">
          <span>Empresas bloqueadas</span>
          <TagInput
            values={value.blockedCompanies}
            onChange={(blockedCompanies) => set('blockedCompanies', blockedCompanies)}
            placeholder="Nombre de la empresa"
            ariaLabel="Empresas bloqueadas"
          />
        </label>
        <Switch
          checked={value.strictFilters}
          onChange={(strictFilters) => set('strictFilters', strictFilters)}
          label="Filtrado estricto"
          description="Oculta lo que no coincida en modalidad, ubicación o tipo de entidad. Si lo desactivas, se muestra con menos puntuación."
        />
      </section>
    </div>
  );
}
