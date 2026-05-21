const TRANSLATIONS = {
  es: {
    // Nav
    nav_grupos: 'Grupos',
    nav_estadisticas: 'Estadísticas',
    nav_ajustes: 'Ajustes',

    // Groups view
    groups_title: 'Grupos de Gastos',
    groups_subtitle: 'Gestiona y divide gastos con tus grupos.',
    btn_create_group: 'Crear Grupo',

    // Group detail
    btn_back: 'Volver',
    tab_overview: 'Vista General',
    tab_transactions: 'Transacciones',
    tab_activity: 'Actividad',
    overview_balances: 'BALANCES',
    overview_members: 'MIEMBROS',

    // Transactions tab
    tx_search_title: 'BUSCAR',
    tx_search_placeholder: 'Buscar gastos...',
    tx_estado_title: 'ESTADO',
    tx_filter_all: 'Todos',
    tx_filter_paid: 'Pagadas',
    tx_filter_pending: 'Pendientes',
    tx_pagador_title: 'PAGADOR',
    tx_chart_title: 'GASTO MENSUAL',
    tx_recent_title: 'TRANSACCIONES RECIENTES',

    // Activity tab
    log_search_placeholder: 'Buscar actividad...',
    log_persona_title: 'PERSONA',
    log_recent_title: 'ACTIVIDAD RECIENTE',

    // Statistics
    stats_balance_title: 'BALANCE CONSOLIDADO',
    stats_me_deben: 'ME DEBEN',
    stats_debo: 'DEBO',
    stats_chart_title: 'TENDENCIAS DE GASTOS (6 MESES)',
    stats_contacts_title: 'SALDOS POR CONTACTO',
    stats_history_title: 'HISTORIAL DE TRANSACCIONES',
    stats_col_group: 'GRUPO',
    stats_col_date: 'FECHA',
    stats_col_concept: 'CONCEPTO',
    stats_col_total: 'MONTO TOTAL',
    stats_col_share: 'TU PARTE',
    stats_col_status: 'ESTADO',
    stats_badge_paid: 'Pagada',
    stats_badge_pending: 'Pendiente',
    stats_contact_owed: 'Te debe',
    stats_contact_owes: 'Le debes',
    stats_settle_btn: 'Saldar',

    // Settings
    aj_cat_label: 'CATEGORÍAS',
    aj_nav_perfil: 'Perfil',
    aj_nav_preferencias: 'Preferencias',
    aj_nav_notificaciones: 'Notificaciones',
    aj_nav_seguridad: 'Seguridad',
    aj_perfil_title: 'PERFIL DE USUARIO',
    aj_btn_edit: 'Editar',
    aj_btn_save: 'Guardar',
    aj_btn_cancel: 'Cancelar',
    aj_field_nombre: 'Nombre Completo',
    aj_field_email: 'Correo Electrónico',
    aj_field_username: 'Nombre de usuario',
    aj_pref_title: 'PREFERENCIAS DE LA CUENTA',
    aj_moneda_label: 'Moneda Principal',
    aj_idioma_label: 'Idioma',
    aj_tema_label: 'Tema Visual',
    aj_tema_dark: 'Oscuro',
    aj_tema_light: 'Claro',
    aj_notif_title: 'NOTIFICACIONES Y ALERTAS',
    aj_notif_gastos_title: 'Nuevos Gastos',
    aj_notif_gastos_desc: 'Recibir alerta cuando se registra un gasto en tus grupos.',
    aj_notif_deudas_title: 'Recordatorios de Deuda',
    aj_notif_deudas_desc: 'Avisos semanales sobre saldos pendientes.',
    aj_notif_actividad_title: 'Actividad de Grupo',
    aj_notif_actividad_desc: 'Invitaciones y cambios de administración.',
    aj_seg_title: 'SEGURIDAD',
    aj_seg_pass_label: 'Cambiar Contraseña',
    aj_seg_pass_btn: 'Gestionar',
    aj_seg_pass_actual: 'Contraseña actual',
    aj_seg_pass_nueva: 'Nueva contraseña',
    aj_seg_pass_confirm: 'Confirmar contraseña',
    aj_seg_pass_save: 'Guardar contraseña',
    aj_seg_logout_label: 'Cerrar sesión',
    aj_seg_logout_btn: 'Salir',

    // Notifications panel
    notifications_title: 'Notificaciones',

    // Modal: Crear Grupo
    modal_create_group_title: 'Crear Nuevo Grupo',
    modal_group_name_label: 'Nombre del grupo',
    modal_group_desc_label: 'Descripción (opcional)',
    modal_group_currency_label: 'Divisa',
    modal_group_members_label: 'Añadir miembros',
    modal_group_members_placeholder: 'Buscar por nombre o correo...',
    modal_btn_cancel: 'Cancelar',
    modal_btn_create_group: 'Crear Grupo',

    // Modal: Añadir Miembros
    modal_add_members_title: 'Añadir Miembros',
    modal_add_members_subtitle: 'Busca y selecciona usuarios para añadir',
    modal_add_members_search_label: 'Buscar usuario',
    modal_add_members_search_placeholder: 'Buscar por nombre o usuario...',
    modal_btn_add_members: 'Añadir Miembros',

    // Modal: Nuevo Gasto
    modal_expense_title: 'Nuevo Gasto',
    modal_expense_subtitle: 'Registra un gasto compartido',
    modal_expense_concept_label: 'Concepto',
    modal_expense_concept_placeholder: 'Ej: Cena en restaurante',
    modal_expense_amount_label: 'Importe',
    modal_expense_date_label: 'Fecha',
    modal_expense_payer_label: '¿Quién pagó?',
    modal_expense_participants_label: 'Participantes',
    modal_btn_add_expense: 'Añadir Gasto',

    // Modal: Editar Gasto
    modal_edit_expense_title: 'Editar Gasto',
    modal_btn_save_expense: 'Guardar cambios',

    // Dynamic JS strings
    js_balance_owes_you: 'Te debe',
    js_balance_you_owe: 'Debes',
    js_balance_settled: 'Saldado',
    js_no_groups: 'No tienes grupos aún',
    js_create_first_group: 'Crea tu primer grupo para empezar',
    js_pay_btn: 'Pagar',
    js_view_img_btn: 'Ver imagen',
    js_edit_btn: 'Editar',
    js_delete_btn: 'Eliminar',
    js_no_transactions: 'No hay transacciones',
    js_no_activity: 'No hay actividad',
    js_show_more: 'Ver más',
    js_show_all: 'Mostrar todo',
    js_show_less: 'Mostrar menos',
    js_total_spent: 'Total gastado',
    js_group_overview: 'GROUP OVERVIEW',
    js_no_balance: 'Sin saldos pendientes',
    js_no_contacts: 'Sin saldos pendientes',
    js_tx_count_suffix: 'transacciones',
  },

  en: {
    // Nav
    nav_grupos: 'Groups',
    nav_estadisticas: 'Statistics',
    nav_ajustes: 'Settings',

    // Groups view
    groups_title: 'Expense Groups',
    groups_subtitle: 'Manage and split expenses with your groups.',
    btn_create_group: 'Create Group',

    // Group detail
    btn_back: 'Back',
    tab_overview: 'Overview',
    tab_transactions: 'Transactions',
    tab_activity: 'Activity',
    overview_balances: 'BALANCES',
    overview_members: 'MEMBERS',

    // Transactions tab
    tx_search_title: 'SEARCH',
    tx_search_placeholder: 'Search expenses...',
    tx_estado_title: 'STATUS',
    tx_filter_all: 'All',
    tx_filter_paid: 'Paid',
    tx_filter_pending: 'Pending',
    tx_pagador_title: 'PAYER',
    tx_chart_title: 'MONTHLY SPENDING',
    tx_recent_title: 'RECENT TRANSACTIONS',

    // Activity tab
    log_search_placeholder: 'Search activity...',
    log_persona_title: 'PERSON',
    log_recent_title: 'RECENT ACTIVITY',

    // Statistics
    stats_balance_title: 'CONSOLIDATED BALANCE',
    stats_me_deben: 'OWED TO ME',
    stats_debo: 'I OWE',
    stats_chart_title: 'SPENDING TRENDS (6 MONTHS)',
    stats_contacts_title: 'BALANCES BY CONTACT',
    stats_history_title: 'TRANSACTION HISTORY',
    stats_col_group: 'GROUP',
    stats_col_date: 'DATE',
    stats_col_concept: 'CONCEPT',
    stats_col_total: 'TOTAL AMOUNT',
    stats_col_share: 'YOUR SHARE',
    stats_col_status: 'STATUS',
    stats_badge_paid: 'Paid',
    stats_badge_pending: 'Pending',
    stats_contact_owed: 'Owes you',
    stats_contact_owes: 'You owe',
    stats_settle_btn: 'Settle',

    // Settings
    aj_cat_label: 'CATEGORIES',
    aj_nav_perfil: 'Profile',
    aj_nav_preferencias: 'Preferences',
    aj_nav_notificaciones: 'Notifications',
    aj_nav_seguridad: 'Security',
    aj_perfil_title: 'USER PROFILE',
    aj_btn_edit: 'Edit',
    aj_btn_save: 'Save',
    aj_btn_cancel: 'Cancel',
    aj_field_nombre: 'Full Name',
    aj_field_email: 'Email',
    aj_field_username: 'Username',
    aj_pref_title: 'ACCOUNT PREFERENCES',
    aj_moneda_label: 'Main Currency',
    aj_idioma_label: 'Language',
    aj_tema_label: 'Visual Theme',
    aj_tema_dark: 'Dark',
    aj_tema_light: 'Light',
    aj_notif_title: 'NOTIFICATIONS & ALERTS',
    aj_notif_gastos_title: 'New Expenses',
    aj_notif_gastos_desc: 'Receive alerts when an expense is added to your groups.',
    aj_notif_deudas_title: 'Debt Reminders',
    aj_notif_deudas_desc: 'Weekly alerts about pending balances.',
    aj_notif_actividad_title: 'Group Activity',
    aj_notif_actividad_desc: 'Invitations and admin changes.',
    aj_seg_title: 'SECURITY',
    aj_seg_pass_label: 'Change Password',
    aj_seg_pass_btn: 'Manage',
    aj_seg_pass_actual: 'Current password',
    aj_seg_pass_nueva: 'New password',
    aj_seg_pass_confirm: 'Confirm password',
    aj_seg_pass_save: 'Save password',
    aj_seg_logout_label: 'Log out',
    aj_seg_logout_btn: 'Exit',

    // Notifications panel
    notifications_title: 'Notifications',

    // Modal: Crear Grupo
    modal_create_group_title: 'Create New Group',
    modal_group_name_label: 'Group name',
    modal_group_desc_label: 'Description (optional)',
    modal_group_currency_label: 'Currency',
    modal_group_members_label: 'Add members',
    modal_group_members_placeholder: 'Search by name or email...',
    modal_btn_cancel: 'Cancel',
    modal_btn_create_group: 'Create Group',

    // Modal: Añadir Miembros
    modal_add_members_title: 'Add Members',
    modal_add_members_subtitle: 'Search and select users to add',
    modal_add_members_search_label: 'Search user',
    modal_add_members_search_placeholder: 'Search by name or username...',
    modal_btn_add_members: 'Add Members',

    // Modal: Nuevo Gasto
    modal_expense_title: 'New Expense',
    modal_expense_subtitle: 'Register a shared expense',
    modal_expense_concept_label: 'Concept',
    modal_expense_concept_placeholder: 'e.g. Dinner at restaurant',
    modal_expense_amount_label: 'Amount',
    modal_expense_date_label: 'Date',
    modal_expense_payer_label: 'Who paid?',
    modal_expense_participants_label: 'Participants',
    modal_btn_add_expense: 'Add Expense',

    // Modal: Editar Gasto
    modal_edit_expense_title: 'Edit Expense',
    modal_btn_save_expense: 'Save changes',

    // Dynamic JS strings
    js_balance_owes_you: 'Owes you',
    js_balance_you_owe: 'You owe',
    js_balance_settled: 'Settled',
    js_no_groups: 'No groups yet',
    js_create_first_group: 'Create your first group to get started',
    js_pay_btn: 'Pay',
    js_view_img_btn: 'View image',
    js_edit_btn: 'Edit',
    js_delete_btn: 'Delete',
    js_no_transactions: 'No transactions',
    js_no_activity: 'No activity',
    js_show_more: 'Show more',
    js_show_all: 'Show all',
    js_show_less: 'Show less',
    js_total_spent: 'Total spent',
    js_group_overview: 'GROUP OVERVIEW',
    js_no_balance: 'No pending balances',
    js_no_contacts: 'No pending balances',
    js_tx_count_suffix: 'transactions',
  }
};

function t(key) {
  const lang = localStorage.getItem('lang') || 'es';
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['es'][key] ?? key;
}

function applyLanguage(lang) {
  localStorage.setItem('lang', lang);

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = TRANSLATIONS[lang]?.[key];
    if (val !== undefined) el.textContent = val;
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = TRANSLATIONS[lang]?.[key];
    if (val !== undefined) el.placeholder = val;
  });

  // Elements with icon + text — preserve the icon, update only text node
  document.querySelectorAll('[data-i18n-text]').forEach(el => {
    const key = el.getAttribute('data-i18n-text');
    const val = TRANSLATIONS[lang]?.[key];
    if (val === undefined) return;
    // Replace last text node
    const nodes = [...el.childNodes];
    const textNode = nodes.reverse().find(n => n.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = ' ' + val;
    else el.appendChild(document.createTextNode(' ' + val));
  });
}
