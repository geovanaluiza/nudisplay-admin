-- ============================================================================
-- 007_power_commands.sql — Phase 5C
--
-- Extends the display_commands_command_check constraint to allow the two
-- new hardware-agnostic power commands sent by the Power Management
-- section in the admin dashboard.
--
-- The display client's commandExecutor.executePowerOff / executePowerOn
-- are stubs in this initial implementation; future integrations
-- (Samsung VXT, LG webOS, BrightSign, Wake-on-LAN, CEC, GPIO relay,
-- etc.) plug in there without further schema changes.
-- ============================================================================

-- Drop the old constraint (the name Supabase auto-generated). If the
-- project is on an older schema the name might differ; we try both
-- the common variants.
alter table public.display_commands
  drop constraint if exists display_commands_command_check;

alter table public.display_commands
  drop constraint if exists display_commands_command_name_check;

-- Discover and drop any other check constraint on the command column.
-- (Postgres doesn't have a built-in "drop all checks on column" so we
-- use a DO block to look up the constraint name dynamically.)
do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'display_commands'
      and att.attname = 'command'
      and con.contype = 'c'
  loop
    execute format('alter table public.display_commands drop constraint %I', cname);
  end loop;
end$$;

-- Re-add with the full set of supported commands.
alter table public.display_commands
  add constraint display_commands_command_check
  check (command in (
    'reload',
    'go_home',
    'blackout',
    'emergency_message',
    'clear_blackout',
    'clear_emergency',
    -- Phase 5C — Power Management
    'power_off',
    'power_on'
  ));
eu eu aAdicionar ao totem da Chapel uma nova seção: "Life Groups, Igrejas Parceiras & Horários de Eventos", abaixo da Agenda da Semana já implementada.

CONTEÚDO (placeholder no config, dados reais serão preenchidos manualmente depois)
Criar três arrays no config (content/kiosk-config.ts), com 1-2 itens de exemplo cada:

```ts
export const gatheringsSchedule = [
  { name: "", day: "", time: "", location: "Chapel", slc: true, type: "congregational" }, // type: congregational | relational | missional | personal
]

export const partnerChurches = [
  { name: "", url: "" }
]

export const lifeGroupsInfo = {
  description: "",
  directoryUrl: "",
  countsAsSLC: true
}
```

DESIGN — SEÇÃO 1: GRADE DE HORÁRIOS SEMANAIS
- Layout em grade: uma linha por dia (Seg–Dom), exibindo os gatherings daquele dia.
- Cada item como card compacto: nome do evento, horário, "Chapel" como local, badge SLC (reaproveitar glassmorphism do badge "NOW PLAYING").
- Dia atual destacado (mesma lógica visual já usada na Agenda da Semana — borda ou fundo diferenciado).
- Diferenciar o "type" de cada gathering só por variação sutil de opacidade/borda dentro da paleta P&B (nunca cor saturada) — ex: borda mais clara para congregational, mais translúcida para relational.
- Tipografia: nome do evento em destaque (sans-serif bold), horário/local em peso mais leve, mesma hierarquia já usada no resto do totem.

DESIGN — SEÇÃO 2: LIFE GROUPS (card de destaque)
- Card único, mais largo que os outros, com leve diferenciação de fundo (ex: borda translúcida ou glassmorphism leve) pra se destacar como "ação recomendada".
- Texto descritivo curto (1-2 linhas) + badge "Conta como SLC".
- CTA tocável: botão "Ver diretório" → abre modal com QR ampliado (reaproveitar o componente de modal de QR já existente).

DESIGN — SEÇÃO 3: IGREJAS PARCEIRAS
- Grid simples (2-3 colunas) com cards minimalistas: nome da igreja + link/site.
- Texto de apoio pequeno acima do grid, tom institucional.
- Nota discreta (texto pequeno, itálico serifado — mesmo estilo usado na citação "Verse of the Week") esclarecendo que participação em igreja local não conta como SLC.

COMPORTAMENTO TOUCH (reaproveitar padrões já estabelecidos)
- Área de toque mín. 44x44px.
- Sem estados de hover, apenas :active.
- Fade-in/slide-up via useInView ao entrar na viewport.
- Modal de QR com auto-fechamento por inatividade (mesma lógica já implementada).

CONSISTÊNCIA VISUAL
- Paleta #0a0a0f, glassmorphism nos badges, serif itálico para acentos, sans-serif bold para títulos — igual ao resto do totem.
- Espaçamento vertical entre as 3 seções consistente com o espaçamento já usado entre Status de Hoje / Agenda / Avisos.

Antes de implementar, mostrar o plano de componentes/arquivos.f