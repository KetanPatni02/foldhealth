import { useState, useRef, useEffect } from 'react';
import { useDraggable, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { HEADER_PRESETS, FOOTER_PRESETS } from './headerFooterLibrary';
import { buildParentMap } from './blockHelpers';
import styles from './EmailBuilder.module.css';

const COMPONENTS = [
  // Row 1: text-flow basics
  { type: 'Text',      label: 'Text',     icon: 'solar:text-square-linear' },
  { type: 'Image',     label: 'Image',    icon: 'solar:gallery-linear' },
  { type: 'Button',    label: 'Button',   icon: 'solar:bolt-circle-linear' },
  // Row 2: minor decorations
  { type: 'Social',    label: 'Social',   icon: 'solar:share-circle-linear' },
  { type: 'Divider',   label: 'Divider',  icon: 'solar:minus-square-linear' },
  { type: 'Spacer',    label: 'Spacer',   icon: 'solar:paragraph-spacing-linear' },
  // Row 3: structural
  { type: 'Hero',      label: 'Hero',     icon: 'solar:laptop-minimalistic-linear' },
  { type: 'Container', label: 'Wrapper',  icon: null, customIcon: 'group' },
  { type: 'Accordion', label: 'Accordion', icon: 'solar:list-arrow-down-linear', soon: true },
  // Row 4
  { type: 'NavBar',    label: 'Nav Bar',  icon: 'solar:hamburger-menu-linear' },
  { type: 'Column',    label: 'Column',   icon: null, customIcon: true },
  // Row 5
  { type: 'Section',   label: 'Section',  icon: 'solar:align-vertical-spacing-linear' },
  { type: 'Form',      label: 'Form',     icon: 'solar:document-add-linear', soon: true },
  { type: 'Table',     label: 'Table',    icon: null, customIcon: 'table' },
  // Row 6 — Header & Footer use a preset picker rather than a single block
  { type: 'Header',    label: 'Header',   icon: null, customIcon: 'header', preset: 'header' },
  { type: 'Footer',    label: 'Footer',   icon: null, customIcon: 'footer', preset: 'footer' },
];

// Pre-configured ColumnsContainer templates so the user can drop a layout
// scaffold without manually setting columnsCount/fixedWidths.
const LAYOUTS = [
  { type: 'Layout-2-equal', label: '2 equal',         glyph: [1, 1] },
  { type: 'Layout-1-2',     label: '1 / 2',           glyph: [1, 2] },
  { type: 'Layout-2-1',     label: '2 / 1',           glyph: [2, 1] },
  { type: 'Layout-3-equal', label: '3 equal',         glyph: [1, 1, 1] },
  { type: 'Layout-1-1-2',   label: '1 / 1 / 2',       glyph: [1, 1, 2] },
];

const TYPE_LABELS = {
  EmailLayout: 'Email',
  Heading: 'Heading',
  Text: 'Text',
  Button: 'Button',
  Image: 'Image',
  Avatar: 'Avatar',
  Divider: 'Divider',
  Spacer: 'Spacer',
  Container: 'Wrapper',
  ColumnsContainer: 'Columns',
  Social: 'Social',
  NavBar: 'Nav Bar',
  Table: 'Table',
};

const TYPE_ICONS = {
  EmailLayout: 'solar:letter-linear',
  Heading: 'solar:document-text-linear',
  Text: 'solar:text-square-linear',
  Button: 'solar:bolt-circle-linear',
  Image: 'solar:gallery-linear',
  Avatar: 'solar:user-circle-linear',
  Divider: 'solar:minus-square-linear',
  Spacer: 'solar:paragraph-spacing-linear',
  Container: 'solar:layers-linear',
  ColumnsContainer: 'solar:hamburger-menu-linear',
  Social: 'solar:share-circle-linear',
  NavBar: 'solar:hamburger-menu-linear',
  Table: 'solar:widget-2-linear',
};

function ColumnIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.74144L11.9626 1.99237L12 2.74144ZM12 29.2612L11.9626 30.0102L12 29.2612ZM20 2.74144L20.0373 1.99237L20 2.74144ZM20 29.2612L20.0373 30.0102L20 29.2612ZM2.66663 16.0013H1.91663C1.91663 19.1228 1.91503 21.5394 2.16739 23.4164C2.42265 25.315 2.95003 26.7735 4.08892 27.9123L4.61925 27.382L5.14958 26.8517C4.33584 26.0379 3.88691 24.9488 3.65402 23.2165C3.41822 21.4627 3.41663 19.1652 3.41663 16.0013H2.66663ZM29.3333 16.0013H28.5833C28.5833 19.1652 28.5817 21.4627 28.3459 23.2165C28.113 24.9488 27.6641 26.0379 26.8503 26.8517L27.3807 27.382L27.911 27.9123C29.0499 26.7735 29.5773 25.315 29.8325 23.4164C30.0849 21.5394 30.0833 19.1228 30.0833 16.0013H29.3333ZM29.3333 16.0013H30.0833C30.0833 12.8798 30.0849 10.4632 29.8325 8.58622C29.5773 6.68763 29.0499 5.22915 27.911 4.09026L27.3807 4.62059L26.8503 5.15092C27.6641 5.96465 28.113 7.05383 28.3459 8.78609C28.5817 10.5399 28.5833 12.8374 28.5833 16.0013H29.3333ZM2.66663 16.0013H3.41663C3.41663 12.8374 3.41822 10.5399 3.65402 8.78609C3.88691 7.05383 4.33584 5.96465 5.14958 5.15092L4.61925 4.62059L4.08892 4.09026C2.95003 5.22915 2.42265 6.68763 2.16739 8.58622C1.91503 10.4632 1.91663 12.8798 1.91663 16.0013H2.66663ZM16 2.66797V1.91797C13.891 1.91797 13.4558 1.91793 11.9626 1.99237L12 2.74144L12.0373 3.49051C13.4918 3.418 13.8966 3.41797 16 3.41797V2.66797ZM12 2.74144L11.9626 1.99237C10.4829 2.06613 8.91508 2.21406 7.53889 2.51627C6.19302 2.81181 4.89762 3.28156 4.08892 4.09026L4.61925 4.62059L5.14958 5.15092C5.6392 4.6613 6.57185 4.26436 7.86061 3.98136C9.11904 3.70501 10.5924 3.56253 12.0373 3.49051L12 2.74144ZM16 29.3346V28.5846C13.8966 28.5846 13.4918 28.5846 12.0373 28.5121L12 29.2612L11.9626 30.0102C13.4558 30.0847 13.891 30.0846 16 30.0846V29.3346ZM12 29.2612L12.0373 28.5121C10.5924 28.4401 9.11904 28.2976 7.86061 28.0212C6.57185 27.7382 5.6392 27.3413 5.14958 26.8517L4.61925 27.382L4.08892 27.9123C4.89762 28.721 6.19302 29.1908 7.53889 29.4863C8.91508 29.7885 10.4829 29.9365 11.9626 30.0102L12 29.2612ZM12 2.74144H11.25V29.2612H12H12.75V2.74144H12ZM16 2.66797V3.41797C18.1033 3.41797 18.5081 3.418 19.9626 3.49051L20 2.74144L20.0373 1.99237C18.5441 1.91793 18.1089 1.91797 16 1.91797V2.66797ZM20 2.74144L19.9626 3.49051C21.4075 3.56253 22.8809 3.70501 24.1393 3.98136C25.4281 4.26436 26.3607 4.6613 26.8503 5.15092L27.3807 4.62059L27.911 4.09026C27.1023 3.28156 25.8069 2.81181 24.461 2.51627C23.0848 2.21406 21.517 2.06613 20.0373 1.99237L20 2.74144ZM16 29.3346V30.0846C18.1089 30.0846 18.5441 30.0847 20.0373 30.0102L20 29.2612L19.9626 28.5121C18.5081 28.5846 18.1033 28.5846 16 28.5846V29.3346ZM20 29.2612L20.0373 30.0102C21.517 29.9365 23.0848 29.7885 24.461 29.4863C25.8069 29.1908 27.1023 28.721 27.911 27.9123L27.3807 27.382L26.8503 26.8517C26.3607 27.3413 25.4281 27.7382 24.1393 28.0212C22.8809 28.2976 21.4075 28.4401 19.9626 28.5121L20 29.2612ZM20 2.74144L19.25 2.74144L19.25 29.2612H20H20.75L20.75 2.74144L20 2.74144Z" fill={color} />
    </svg>
  );
}

function TableIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.33329 10.742H28.6666M2.66663 19.8902H29.3333M16 11.2235V29.3346M13.3333 29.3346C13.106 29.3346 12.8838 29.3346 12.6666 29.3345C10.3993 29.3328 8.67629 29.3136 7.33329 29.0946C5.95923 28.8704 4.98299 28.437 4.22872 27.599C2.66663 25.8633 2.66663 23.0698 2.66663 17.4828V14.5198C2.66663 8.9328 2.66663 6.1393 4.22872 4.40363C5.79082 2.66797 8.30498 2.66797 13.3333 2.66797H18.6666C23.6949 2.66797 26.2091 2.66797 27.7712 4.40363C29.3333 6.1393 29.3333 8.9328 29.3333 14.5198V17.4828C29.3333 23.0698 29.3333 25.8633 27.7712 27.599C26.793 28.6858 25.4416 29.0921 23.3333 29.244C22.0747 29.3346 20.5463 29.3346 18.6666 29.3346H13.3333Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke={color} strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

function HeaderIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.8284 3.13402L21.1762 2.77476L20.8284 3.13402ZM3.17157 3.13402L2.82382 2.77476L3.17157 3.13402ZM2.00615 8L1.50618 7.9942L2.00615 8ZM4.5 4.5C4.22386 4.5 4 4.72386 4 5C4 5.27614 4.22386 5.5 4.5 5.5V5V4.5ZM7.5 5.5C7.77614 5.5 8 5.27614 8 5C8 4.72386 7.77614 4.5 7.5 4.5V5V5.5ZM10 4.5C9.72386 4.5 9.5 4.72386 9.5 5C9.5 5.27614 9.72386 5.5 10 5.5V5V4.5ZM14 5.5C14.2761 5.5 14.5 5.27614 14.5 5C14.5 4.72386 14.2761 4.5 14 4.5V5V5.5ZM16.5 4.5C16.2239 4.5 16 4.72386 16 5C16 5.27614 16.2239 5.5 16.5 5.5V5V4.5ZM19.5 5.5C19.7761 5.5 20 5.27614 20 5C20 4.72386 19.7761 4.5 19.5 4.5V5V5.5ZM10 2V2.5H14V2V1.5H10V2ZM22 9.74358H21.5V13.7949H22H22.5V9.74358H22ZM14 22V21.5H10V22V22.5H14V22ZM2 13.7949H2.5V9.74358H2H1.5V13.7949H2ZM10 22V21.5C8.09989 21.5 6.72639 21.4989 5.67921 21.3545C4.64775 21.2122 4.00753 20.9395 3.52957 20.4493L3.17157 20.7984L2.81357 21.1474C3.50719 21.8588 4.39556 22.1869 5.54261 22.3451C6.67395 22.5011 8.12887 22.5 10 22.5V22ZM2 13.7949H1.5C1.5 15.715 1.49899 17.2042 1.65069 18.3615C1.8041 19.5318 2.12167 20.4378 2.81357 21.1474L3.17157 20.7984L3.52957 20.4493C3.0499 19.9574 2.78168 19.2955 2.64221 18.2315C2.50101 17.1544 2.5 15.7426 2.5 13.7949H2ZM22 13.7949H21.5C21.5 15.7426 21.499 17.1544 21.3578 18.2315C21.2183 19.2955 20.9501 19.9574 20.4704 20.4493L20.8284 20.7984L21.1864 21.1474C21.8783 20.4378 22.1959 19.5318 22.3493 18.3615C22.501 17.2042 22.5 15.715 22.5 13.7949H22ZM14 22V22.5C15.8711 22.5 17.326 22.5011 18.4574 22.3451C19.6044 22.1869 20.4928 21.8588 21.1864 21.1474L20.8284 20.7984L20.4704 20.4493C19.9925 20.9395 19.3522 21.2122 18.3208 21.3545C17.2736 21.4989 15.9001 21.5 14 21.5V22ZM14 2V2.5C15.8993 2.5 17.2751 2.501 18.3246 2.63757C19.3613 2.77249 20.0038 3.03173 20.4807 3.49329L20.8284 3.13402L21.1762 2.77476C20.4814 2.1023 19.5954 1.79452 18.4536 1.64593C17.3246 1.499 15.8719 1.5 14 1.5V2ZM10 2V1.5C8.12807 1.5 6.67542 1.499 5.54639 1.64593C4.40459 1.79452 3.51855 2.1023 2.82382 2.77476L3.17157 3.13402L3.51932 3.49329C3.99617 3.03173 4.63872 2.77249 5.67544 2.63757C6.72491 2.501 8.10069 2.5 10 2.5V2ZM2 9.74358H2.5C2.5 9.10852 2.50001 8.53238 2.50611 8.0058L2.00615 8L1.50618 7.9942C1.49999 8.52771 1.5 9.11 1.5 9.74358H2ZM2.00615 8L2.50611 8.0058C2.53583 5.44388 2.72476 4.26238 3.51932 3.49329L3.17157 3.13402L2.82382 2.77476C1.6824 3.87959 1.53493 5.51565 1.50618 7.9942L2.00615 8ZM22 9.74358H22.5C22.5 9.11 22.5 8.52771 22.4938 7.9942L21.9939 8L21.4939 8.0058C21.5 8.53238 21.5 9.10852 21.5 9.74358H22ZM21.9939 8L22.4938 7.9942C22.4651 5.51565 22.3176 3.87959 21.1762 2.77476L20.8284 3.13402L20.4807 3.49329C21.2752 4.26238 21.4642 5.44388 21.4939 8.0058L21.9939 8ZM2.00615 8V8.5H21.9939V8V7.5H2.00615V8ZM4.5 5V5.5H7.5V5V4.5H4.5V5ZM10 5V5.5H14V5V4.5H10V5ZM16.5 5V5.5H19.5V5V4.5H16.5V5Z" fill={color} />
    </svg>
  );
}

function FooterIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.17157 20.7984L2.81357 21.1474L3.17157 20.7984ZM20.8284 20.7984L21.1864 21.1474L20.8284 20.7984ZM4.5 18C4.22386 18 4 18.2239 4 18.5C4 18.7761 4.22386 19 4.5 19V18.5V18ZM7.5 19C7.77614 19 8 18.7761 8 18.5C8 18.2239 7.77614 18 7.5 18V18.5V19ZM10 18C9.72386 18 9.5 18.2239 9.5 18.5C9.5 18.7761 9.72386 19 10 19V18.5V18ZM14 19C14.2761 19 14.5 18.7761 14.5 18.5C14.5 18.2239 14.2761 18 14 18V18.5V19ZM16.5 18C16.2239 18 16 18.2239 16 18.5C16 18.7761 16.2239 19 16.5 19V18.5V18ZM19.5 19C19.7761 19 20 18.7761 20 18.5C20 18.2239 19.7761 18 19.5 18V18.5V19ZM2.00473 15.5L1.50475 15.5045L2.00473 15.5ZM10 2V2.5H14V2V1.5H10V2ZM22 9.74358H21.5V13.7949H22H22.5V9.74358H22ZM14 22V21.5H10V22V22.5H14V22ZM2 13.7949H2.5V9.74358H2H1.5V13.7949H2ZM10 22V21.5C8.09989 21.5 6.72639 21.4989 5.67921 21.3545C4.64775 21.2122 4.00753 20.9395 3.52957 20.4493L3.17157 20.7984L2.81357 21.1474C3.50719 21.8588 4.39556 22.1869 5.54261 22.3451C6.67395 22.5011 8.12887 22.5 10 22.5V22ZM14 22V22.5C15.8711 22.5 17.326 22.5011 18.4574 22.3451C19.6044 22.1869 20.4928 21.8588 21.1864 21.1474L20.8284 20.7984L20.4704 20.4493C19.9925 20.9395 19.3522 21.2122 18.3208 21.3545C17.2736 21.4989 15.9001 21.5 14 21.5V22ZM14 2V2.5C15.8993 2.5 17.2751 2.501 18.3246 2.63757C19.3613 2.77249 20.0038 3.03173 20.4807 3.49329L20.8284 3.13402L21.1762 2.77476C20.4814 2.1023 19.5954 1.79452 18.4536 1.64593C17.3246 1.499 15.8719 1.5 14 1.5V2ZM22 9.74358H22.5C22.5 7.93299 22.5011 6.52311 22.3488 5.42638C22.1942 4.31356 21.8732 3.44942 21.1762 2.77476L20.8284 3.13402L20.4807 3.49329C20.9552 3.95264 21.22 4.5681 21.3583 5.56396C21.4989 6.57593 21.5 7.90381 21.5 9.74358H22ZM10 2V1.5C8.12807 1.5 6.67542 1.499 5.54639 1.64593C4.40459 1.79452 3.51855 2.1023 2.82382 2.77476L3.17157 3.13402L3.51932 3.49329C3.99617 3.03173 4.63872 2.77249 5.67544 2.63757C6.72491 2.501 8.10069 2.5 10 2.5V2ZM2 9.74358H2.5C2.5 7.90381 2.50113 6.57593 2.64169 5.56396C2.78002 4.5681 3.04476 3.95264 3.51932 3.49329L3.17157 3.13402L2.82382 2.77476C2.12682 3.44942 1.80577 4.31356 1.6512 5.42639C1.49887 6.52311 1.5 7.93299 1.5 9.74358H2ZM4.5 18.5V19H7.5V18.5V18H4.5V18.5ZM10 18.5V19H14V18.5V18H10V18.5ZM16.5 18.5V19H19.5V18.5V18H16.5V18.5ZM2 13.7949H1.5C1.5 14.4101 1.5 14.9792 1.50475 15.5045L2.00473 15.5L2.50471 15.4955C2.5 14.9756 2.5 14.4112 2.5 13.7949H2ZM2.00473 15.5L1.50475 15.5045C1.51722 16.8833 1.5621 17.9972 1.73726 18.9005C1.91493 19.8168 2.23287 20.5518 2.81357 21.1474L3.17157 20.7984L3.52957 20.4493C3.12522 20.0346 2.87222 19.5005 2.71897 18.7101C2.56321 17.9069 2.5172 16.8767 2.50471 15.4955L2.00473 15.5ZM22 13.7949H21.5C21.5 14.4112 21.5 14.9756 21.4953 15.4955L21.9953 15.5L22.4953 15.5045C22.5 14.9792 22.5 14.4101 22.5 13.7949H22ZM21.9953 15.5L21.4953 15.4955C21.4828 16.8767 21.4368 17.9069 21.281 18.7101C21.1278 19.5005 20.8748 20.0346 20.4704 20.4493L20.8284 20.7984L21.1864 21.1474C21.7671 20.5518 22.0851 19.8168 22.2627 18.9005C22.4379 17.9972 22.4828 16.8833 22.4953 15.5045L21.9953 15.5ZM2.00473 15.5V16H21.9953V15.5V15H2.00473V15.5Z" fill={color} />
    </svg>
  );
}

export function ComponentsPanel() {
  const [tab, setTab] = useState('components');
  const [presetPicker, setPresetPicker] = useState(null); // 'header' | 'footer' | null
  const [renamingId, setRenamingId] = useState(null);
  const addBlock = useAppStore(s => s.addBlock);
  const showToast = useAppStore(s => s.showToast);
  const emailDocument = useAppStore(s => s.emailDocument);
  const editingCampaignName = useAppStore(s => s.editingCampaignName);
  const selectedBlockId = useAppStore(s => s.selectedBlockId);
  const setSelectedBlockId = useAppStore(s => s.setSelectedBlockId);
  const removeBlock = useAppStore(s => s.removeBlock);
  const replaceHeaderFooter = useAppStore(s => s.replaceHeaderFooter);

  useEffect(() => {
    const handler = (e) => {
      setTab('layers');
      setRenamingId(e.detail.id);
    };
    window.addEventListener('eb:rename', handler);
    return () => window.removeEventListener('eb:rename', handler);
  }, []);

  const handleAdd = (item) => {
    if (item.soon) { showToast(`${item.label} — coming soon`); return; }
    if (item.preset) { setPresetPicker(item.preset); return; }
    addBlock(item.type);
  };

  const handlePickPreset = (role, preset) => {
    let counter = Date.now();
    const genId = () => `block-${counter++}-${Math.random().toString(36).slice(2, 5)}`;
    const tree = preset.build(genId, editingCampaignName || 'Welcome');
    replaceHeaderFooter(role, tree);
    setPresetPicker(null);
  };

  return (
    <div className={styles.leftPanel}>
      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === 'components' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('components')}
        >Components</button>
        <button
          className={[styles.tab, tab === 'layers' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('layers')}
        >Layers</button>
      </div>

      <div className={styles.panelScrollFlush}>
        {tab === 'components' ? (
          <>
            <p className={styles.sectionHeading}>Content</p>
            <div className={styles.componentGrid}>
              {COMPONENTS.map(c => (
                <DraggableTile key={c.type} item={c} onClick={() => handleAdd(c)} />
              ))}
            </div>

            {presetPicker && (
              <PresetPicker
                role={presetPicker}
                presets={presetPicker === 'header' ? HEADER_PRESETS : FOOTER_PRESETS}
                onPick={(p) => handlePickPreset(presetPicker, p)}
                onClose={() => setPresetPicker(null)}
              />
            )}

            <p className={styles.sectionHeading}>Layout</p>
            <div className={styles.layoutGrid}>
              {LAYOUTS.map(l => (
                <DraggableLayoutTile key={l.type} layout={l} onClick={() => addBlock(l.type)} />
              ))}
            </div>
          </>
        ) : (
          <LayerList
            doc={emailDocument}
            selectedId={selectedBlockId}
            onSelect={setSelectedBlockId}
            onRemove={removeBlock}
            renamingId={renamingId}
            setRenamingId={setRenamingId}
          />
        )}
      </div>
    </div>
  );
}

function DraggableTile({ item, onClick }) {
  // Soon items can't be added or dragged.
  const draggable = useDraggable({
    id: `__new:${item.type}`,
    disabled: !!item.soon || !!item.preset,
  });
  const { attributes, listeners, setNodeRef, isDragging } = draggable;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[styles.componentTile, isDragging ? styles.componentTileDragging : ''].join(' ')}
      onClick={onClick}
      title={item.soon ? `${item.label} — coming soon` : `Add ${item.label}`}
    >
      {item.customIcon === true && <ColumnIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'table' && <TableIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'group' && <GroupIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'header' && <HeaderIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'footer' && <FooterIcon size={20} color="var(--neutral-300)" />}
      {!item.customIcon && <Icon name={item.icon} size={20} color="var(--neutral-300)" />}
      {item.label}
    </button>
  );
}

function DraggableLayoutTile({ layout, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `__new:${layout.type}`,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[styles.layoutTile, isDragging ? styles.componentTileDragging : ''].join(' ')}
      onClick={onClick}
      title={`Add ${layout.label} layout`}
    >
      <div className={styles.layoutGlyph}>
        {layout.glyph.map((flex, i) => (
          <div key={i} className={styles.layoutGlyphCol} style={{ flex }} />
        ))}
      </div>
    </button>
  );
}

function PresetPicker({ role, presets, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.presetPicker}>
      <div className={styles.presetPickerHeader}>
        <span>Choose a {role}</span>
        <button className={styles.presetPickerClose} onClick={onClose} aria-label="Close">
          <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
        </button>
      </div>
      {presets.map(p => (
        <button key={p.id} className={styles.presetPickerItem} onClick={() => onPick(p)}>
          <div className={styles.presetThumb} style={{ background: p.accent + '22' }}>
            <div className={styles.presetThumbBar} style={{ background: p.accent }} />
          </div>
          <div className={styles.presetText}>
            <div className={styles.presetTitle}>{p.label}</div>
            <div className={styles.presetDesc}>{p.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function layerLabel(block) {
  if (block.data?.alias) return block.data.alias;
  const role = block.data?.role;
  if (role === 'header') return 'Header';
  if (role === 'body') return 'Body';
  if (role === 'footer') return 'Footer';
  if (block.type === 'Heading' || block.type === 'Text') {
    return `${TYPE_LABELS[block.type]}: ${(block.data?.props?.text || '').slice(0, 22)}`;
  }
  return TYPE_LABELS[block.type] || block.type;
}

function layerIcon(block) {
  const role = block.data?.role;
  if (role === 'header') return 'solar:gallery-wide-linear';
  if (role === 'body') return 'solar:document-text-linear';
  if (role === 'footer') return 'solar:gallery-bold-linear';
  return TYPE_ICONS[block.type] || 'solar:square-linear';
}

const STRUCTURAL_ROLES = new Set(['header', 'body', 'footer']);

function LayerList({ doc, selectedId, onSelect, onRemove, renamingId, setRenamingId }) {
  if (!doc) return null;
  const moveBlock = useAppStore(s => s.moveBlock);
  const updateBlock = useAppStore(s => s.updateBlock);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const allSortableIds = [];
  const collectIds = (childrenIds) => {
    (childrenIds || []).forEach(id => {
      const block = doc[id];
      if (!block) return;
      allSortableIds.push(id);
      const props = block.data?.props || {};
      if (Array.isArray(props.childrenIds)) collectIds(props.childrenIds);
      if (Array.isArray(props.columns)) props.columns.forEach(c => collectIds(c.childrenIds || []));
    });
  };
  collectIds(doc.root.data.childrenIds || []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    const overBlock = doc[overId];
    if (!overBlock) return;
    const map = buildParentMap(doc);
    const overSlot = map[overId];
    if (!overSlot) return;
    moveBlock(activeId, { parentId: overSlot.parentId, columnIdx: overSlot.columnIdx, index: overSlot.index });
  };

  const ctx = { doc, selectedId, onSelect, onRemove, renamingId, setRenamingId, updateBlock };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
        <div className={styles.layerList}>
          <LayerChildren childrenIds={doc.root.data.childrenIds || []} depth={0} ctx={ctx} />
        </div>
      </SortableContext>
    </DndContext>
  );
}

function LayerChildren({ childrenIds, depth, ctx }) {
  return (childrenIds || []).map(id => {
    const block = ctx.doc[id];
    if (!block) return null;
    return <LayerRow key={id} id={id} block={block} depth={depth} ctx={ctx} />;
  });
}

function LayerRow({ id, block, depth, ctx }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [expanded, setExpanded] = useState(true);
  const renameInputRef = useRef(null);
  const isRenaming = ctx.renamingId === id;
  const props = block.data?.props || {};
  const hasChildren = Array.isArray(props.childrenIds) && props.childrenIds.length > 0;
  const hasColumns = Array.isArray(props.columns) && props.columns.some(c => (c.childrenIds || []).length > 0);
  const isExpandable = hasChildren || hasColumns;
  const isStructural = STRUCTURAL_ROLES.has(block.data?.role);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = (value) => {
    const trimmed = value.trim();
    ctx.updateBlock(id, prev => ({
      ...prev,
      data: { ...prev.data, alias: trimmed || undefined },
    }));
    ctx.setRenamingId(null);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={[styles.layerRow, ctx.selectedId === id ? styles.layerRowActive : ''].join(' ')}
        onClick={() => ctx.onSelect(id)}
        onDoubleClick={() => ctx.setRenamingId(id)}
      >
        <span style={{ width: depth * 16, flexShrink: 0 }} />
        {isExpandable ? (
          <button
            className={styles.layerExpandBtn}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <Icon name={expanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={12} color="currentColor" />
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <Icon name={layerIcon(block)} size={14} color="currentColor" />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className={styles.layerRenameInput}
            defaultValue={block.data?.alias || layerLabel(block)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename(e.target.value);
              if (e.key === 'Escape') ctx.setRenamingId(null);
            }}
          />
        ) : (
          <span className={styles.layerRowText}>{layerLabel(block)}</span>
        )}
        {!isStructural && (
          <button
            className={styles.layerRemove}
            onClick={(e) => { e.stopPropagation(); ctx.onRemove(id); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete"
          >
            <Icon name="solar:trash-bin-trash-linear" size={14} color="currentColor" />
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <LayerChildren childrenIds={props.childrenIds} depth={depth + 1} ctx={ctx} />
      )}
      {expanded && hasColumns && props.columns.map((col, ci) => (
        (col.childrenIds || []).length > 0 && (
          <LayerChildren key={ci} childrenIds={col.childrenIds} depth={depth + 1} ctx={ctx} />
        )
      ))}
    </>
  );
}
