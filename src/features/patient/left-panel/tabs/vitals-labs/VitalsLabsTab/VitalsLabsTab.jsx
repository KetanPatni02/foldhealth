import { useState } from 'react';
import {
  ComposedChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from '../../../../../../components/LazyRecharts/LazyRecharts';
import { Toggle } from '../../../../../../components/Toggle/Toggle';
import styles from './VitalsLabsTab.module.css';

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.33 14.17C1.06 14.17 0.83 14.39 0.83 14.67C0.83 14.94 1.06 15.17 1.33 15.17V14.67V14.17ZM14.67 14.67V14.17H1.33V14.67V15.17H14.67V14.67ZM11 8.67V9.17H13V8.67V8.17H11V8.67ZM14 9.67H13.5V14.67H14H14.5V9.67H14ZM10 14.67H10.5V9.67H10H9.5V14.67H10ZM13 8.67V9.17C13.28 9.17 13.5 9.39 13.5 9.67H14H14.5C14.5 8.84 13.83 8.17 13 8.17V8.67ZM11 8.67V8.17C10.17 8.17 9.5 8.84 9.5 9.67H10H10.5C10.5 9.39 10.72 9.17 11 9.17V8.67ZM10 3.33H9.5V14.67H10H10.5V3.33H10ZM6 14.67H6.5V3.33H6H5.5V14.67H6ZM8 1.33V1.83C8.49 1.83 8.8 1.84 9.03 1.87C9.25 1.9 9.32 1.94 9.35 1.98L9.71 1.63L10.06 1.27C9.81 1.02 9.49 0.92 9.16 0.88C8.85 0.83 8.46 0.83 8 0.83V1.33ZM10 3.33H10.5C10.5 2.88 10.5 2.48 10.46 2.17C10.41 1.84 10.32 1.53 10.06 1.27L9.71 1.63L9.35 1.98C9.39 2.02 9.44 2.09 9.47 2.3C9.5 2.53 9.5 2.85 9.5 3.33H10ZM8 1.33V0.83C7.54 0.83 7.15 0.83 6.84 0.88C6.51 0.92 6.19 1.02 5.94 1.27L6.29 1.63L6.65 1.98C6.68 1.94 6.75 1.9 6.97 1.87C7.2 1.84 7.51 1.83 8 1.83V1.33ZM6 3.33H6.5C6.5 2.85 6.5 2.53 6.53 2.3C6.56 2.09 6.61 2.02 6.65 1.98L6.29 1.63L5.94 1.27C5.68 1.53 5.58 1.84 5.54 2.17C5.5 2.48 5.5 2.88 5.5 3.33H6ZM3 5.33V5.83H5V5.33V4.83H3V5.33ZM6 6.33H5.5V14.67H6H6.5V6.33H6ZM2 14.67H2.5V6.33H2H1.5V14.67H2ZM5 5.33V5.83C5.28 5.83 5.5 6.06 5.5 6.33H6H6.5C6.5 5.51 5.83 4.83 5 4.83V5.33ZM3 5.33V4.83C2.17 4.83 1.5 5.51 1.5 6.33H2H2.5C2.5 6.06 2.72 5.83 3 5.83V5.33Z" fill="currentColor"/>
    </svg>
  );
}

function AddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8.5C12.28 8.5 12.5 8.28 12.5 8C12.5 7.72 12.28 7.5 12 7.5V8V8.5ZM4 7.5C3.72 7.5 3.5 7.72 3.5 8C3.5 8.28 3.72 8.5 4 8.5V8V7.5ZM8.5 4C8.5 3.72 8.28 3.5 8 3.5C7.72 3.5 7.5 3.72 7.5 4L8 4L8.5 4ZM7.5 12C7.5 12.28 7.72 12.5 8 12.5C8.28 12.5 8.5 12.28 8.5 12H8H7.5ZM12 8V7.5H8V8V8.5H12V8ZM8 8V7.5H4V8V8.5H8V8ZM8 4L7.5 4L7.5 8L8 8H8.5L8.5 4L8 4ZM8 8H7.5V12H8H8.5V8H8Z" fill="currentColor"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.69 2.98C3.49 2.79 3.17 2.79 2.98 2.98C2.78 3.18 2.78 3.49 2.98 3.69L3.33 3.33L3.69 2.98ZM11.65 12.35C11.84 12.55 12.158 12.55 12.35 12.35C12.55 12.16 12.55 11.84 12.35 11.65L12 12L11.65 12.35ZM10.66 3.3L11.013 2.95V2.95L10.66 3.3ZM12.71 5.36L13.07 5V5L12.71 5.36ZM5.83 12.95L5.47 13.31H5.47L5.83 12.95ZM3.08 10.21L3.43 9.85H3.43L3.08 10.21ZM3.9 7.12L4.03 7.6H4.03L3.9 7.12ZM4.87 6.76L4.58 6.35L4.58 6.35L4.87 6.76ZM5.5 6.85C5.68 6.64 5.65 6.33 5.44 6.15C5.23 5.97 4.92 5.99 4.74 6.2L5.12 6.53L5.5 6.85ZM8.92 12.13L9.4 12.27V12.27L8.92 12.13ZM9.28 11.165L9.68 11.46V11.46L9.28 11.165ZM9.83 11.299C10.04 11.12 10.06 10.8 9.88 10.59C9.7 10.38 9.38 10.36 9.17 10.543L9.5 10.921L9.83 11.299ZM1.81 8.5L1.31 8.51L1.31 8.51L1.81 8.5ZM1.95 7.97L2.39 8.22V8.22L1.95 7.97ZM7.54 14.23L7.54 13.73H7.54L7.54 14.23ZM8.06 14.09L7.81 13.66L7.81 13.66L8.06 14.09ZM14.64 8.2L15.13 8.31L15.13 8.31L14.64 8.2ZM11.54 9.53C11.28 9.63 11.15 9.91 11.24 10.17C11.34 10.43 11.63 10.562 11.89 10.46L11.711 10L11.54 9.53ZM7.8 1.36L7.91 1.85V1.85L7.8 1.36ZM5.55 4.15C5.45 4.41 5.59 4.7 5.85 4.79C6.1 4.89 6.39 4.76 6.49 4.5L6.02 4.32L5.55 4.15ZM0.98 14.31C0.78 14.51 0.78 14.83 0.98 15.02C1.175 15.22 1.49 15.22 1.69 15.02L1.33 14.67L0.98 14.31ZM4.79 11.92C4.98 11.72 4.98 11.4 4.79 11.21C4.59 11.01 4.28 11.01 4.08 11.21L4.44 11.562L4.79 11.92ZM3.33 3.33L2.98 3.69L11.65 12.35L12 12L12.35 11.65L3.69 2.98L3.33 3.33ZM10.66 3.3L10.31 3.65L12.36 5.71L12.71 5.36L13.07 5L11.013 2.95L10.66 3.3ZM5.83 12.95L6.18 12.6L3.43 9.85L3.08 10.21L2.73 10.56L5.47 13.31L5.83 12.95ZM3.9 7.12L4.03 7.6C4.5 7.47 4.86 7.38 5.16 7.16L4.87 6.76L4.58 6.35C4.46 6.43 4.31 6.48 3.76 6.63L3.9 7.12ZM4.87 6.76L5.16 7.16C5.28 7.07 5.4 6.97 5.5 6.85L5.12 6.53L4.74 6.2C4.69 6.26 4.63 6.31 4.58 6.35L4.87 6.76ZM8.92 12.13L9.4 12.27C9.55 11.72 9.6 11.57 9.68 11.46L9.28 11.165L8.87 10.87C8.66 11.17 8.57 11.53 8.44 12L8.92 12.13ZM9.5 10.921L9.17 10.543C9.06 10.641 8.96 10.75 8.87 10.87L9.28 11.165L9.68 11.46C9.73 11.4 9.77 11.35 9.83 11.299L9.5 10.921ZM3.08 10.21L3.43 9.85C3 9.42 2.71 9.128 2.52 8.89C2.33 8.65 2.31 8.55 2.31 8.5L1.81 8.5L1.31 8.51C1.31 8.9 1.51 9.22 1.74 9.51C1.97 9.81 2.31 10.15 2.73 10.56L3.08 10.21ZM3.9 7.12L3.76 6.63C3.2 6.79 2.74 6.92 2.39 7.06C2.04 7.2 1.71 7.38 1.52 7.72L1.95 7.97L2.39 8.22C2.41 8.18 2.48 8.1 2.76 7.98C3.04 7.87 3.44 7.76 4.03 7.6L3.9 7.12ZM1.81 8.5L2.31 8.5C2.31 8.4 2.34 8.3 2.39 8.22L1.95 7.97L1.52 7.72C1.38 7.96 1.31 8.23 1.31 8.51L1.81 8.5ZM5.83 12.95L5.47 13.31C5.89 13.723 6.23 14.07 6.52 14.3C6.82 14.535 7.14 14.73 7.54 14.73L7.54 14.23L7.54 13.73C7.49 13.73 7.39 13.71 7.15 13.52C6.91 13.33 6.61 13.03 6.18 12.6L5.83 12.95ZM8.92 12.13L8.44 12C8.28 12.59 8.16 13 8.05 13.28C7.94 13.57 7.85 13.63 7.81 13.66L8.06 14.09L8.31 14.52C8.65 14.331 8.84 14 8.98 13.65C9.12 13.3 9.25 12.84 9.4 12.27L8.92 12.13ZM7.54 14.23L7.54 14.73C7.81 14.73 8.07 14.66 8.31 14.52L8.06 14.09L7.81 13.66C7.73 13.7 7.63 13.73 7.54 13.73L7.54 14.23ZM12.71 5.36L12.36 5.71C13.07 6.42 13.56 6.91 13.86 7.32C14.16 7.72 14.19 7.93 14.15 8.1L14.64 8.2L15.13 8.31C15.26 7.72 15.03 7.21 14.66 6.72C14.31 6.24 13.75 5.69 13.07 5L12.71 5.36ZM11.711 10L11.89 10.46C12.79 10.12 13.529 9.85 14.051 9.56C14.58 9.27 15.01 8.9 15.13 8.31L14.64 8.2L14.15 8.1C14.12 8.27 14 8.44 13.57 8.69C13.124 8.93 12.47 9.18 11.54 9.53L11.711 10ZM10.66 3.3L11.013 2.95C10.32 2.26 9.77 1.7 9.28 1.34C8.79 0.98 8.28 0.74 7.69 0.87L7.8 1.36L7.91 1.85C8.07 1.81 8.28 1.84 8.69 2.14C9.1 2.44 9.59 2.94 10.31 3.65L10.66 3.3ZM6.02 4.32L6.49 4.5C6.83 3.55 7.08 2.89 7.32 2.44C7.56 2 7.74 1.88 7.91 1.85L7.8 1.36L7.69 0.87C7.1 1 6.73 1.43 6.44 1.96C6.15 2.49 5.88 3.24 5.55 4.15L6.02 4.32ZM1.33 14.67L1.69 15.02L4.79 11.92L4.44 11.562L4.08 11.21L0.98 14.31L1.33 14.67Z" fill="currentColor"/>
    </svg>
  );
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Table data ──────────────────────────────────────────────────────────────

const TABLE_SECTIONS = [
  {
    id: 'vitals', title: 'Vitals',
    rows: [
      { id: 'bp',   name: 'Blood Pressure',    unit: 'mmHg',        hasPin: true,
        values: [{ v: '145/90', date: '3/9/25' }, { v: '130/80', date: '3/1/25' }, { v: '120/80', date: '2/24/25' }] },
      { id: 'spo2', name: 'Blood Oxygen',       unit: '%',           hasPin: true,
        values: [{ v: '98%', date: '3/9/25' }, { v: '95%', date: '3/1/25', flag: true }, { v: '97%', date: '2/24/25', flag: true }] },
      { id: 'rr',   name: 'Respiration Rate',   unit: 'breaths/min', hasPin: false,
        values: [{ v: '22', date: '3/9/25' }, { v: '18', date: '3/1/25' }, { v: '20', date: '2/24/25' }] },
      { id: 'ht',   name: 'Height',             unit: 'ft',          hasPin: false,
        values: [{ v: '5\'8"', date: '3/9/25' }, { v: '5\'8"', date: '3/1/25' }, { v: '5\'8"', date: '2/24/25' }] },
      { id: 'wt',   name: 'Weight',             unit: 'lbs',         hasPin: false,
        values: [{ v: '150', date: '3/9/25' }, { v: '175', date: '3/1/25', flag: true }, { v: '200', date: '2/24/25', flag: true }] },
      { id: 'bmi',  name: 'BMI',                unit: 'BMI',         hasPin: false,
        values: [{ v: '22.5', date: '3/9/25' }, { v: '27.3', date: '3/1/25', flag: true }, { v: '24.1', date: '2/24/25', flag: true }] },
      { id: 'bt',   name: 'Body Temperature',   unit: '°F',          hasPin: false,
        values: [{ v: '98.6', date: '3/9/25' }, { v: '99.1', date: '3/1/25' }, { v: '97.8', date: '2/24/25' }] },
      { id: 'hc',   name: 'Head Circumference', unit: 'cm',          hasPin: false,
        values: [{ v: '48', date: '3/9/25', flag: true }, { v: '45', date: '3/1/25' }, { v: '44', date: '2/24/25' }] },
    ],
  },
  {
    id: 'biomarkers', title: 'Biomarkers',
    rows: [
      { id: 'bg',  name: 'Blood Glucose',      unit: 'mg/dL', hasPin: true,
        values: [{ v: '85', date: '3/9/25' }, { v: '92', date: '3/1/25' }, { v: '78', date: '2/24/25' }] },
      { id: 'rhr', name: 'Resting Heart Rate', unit: 'bpm',   hasPin: false,
        values: [{ v: '72', date: '3/9/25' }, { v: '68', date: '3/1/25' }, { v: '75', date: '2/24/25', flag: true }] },
    ],
  },
  {
    id: 'activity', title: 'Activity',
    rows: [
      { id: 'steps', name: 'Steps', unit: 'steps', hasPin: false,
        values: [{ v: '5,675', date: '3/9/25' }, { v: '4,321', date: '3/1/25', flag: true }, { v: '7,890', date: '2/24/25' }] },
    ],
  },
  {
    id: 'lab', title: 'Lab Monitoring',
    rows: [
      { id: 'hba1c', name: 'HbA1c',             unit: '%',     hasPin: false,
        values: [{ v: '6.8', date: '3/9/25' }, { v: '7.2', date: '3/1/25', flag: true }, { v: '6.5', date: '2/24/25' }] },
      { id: 'chol',  name: 'Total Cholesterol',  unit: 'mg/dL', hasPin: false,
        values: [{ v: '185', date: '3/9/25' }, { v: '210', date: '3/1/25', flag: true }, { v: '195', date: '2/24/25' }] },
      { id: 'ldl',   name: 'LDL',               unit: 'mg/dL', hasPin: false,
        values: [{ v: '112', date: '3/9/25' }, { v: '130', date: '3/1/25', flag: true }, { v: '118', date: '2/24/25' }] },
    ],
  },
];

// ── Graph data ──────────────────────────────────────────────────────────────

const GRAPH_SECTIONS = [
  {
    id: 'vitals', title: 'Vitals', showRangeToggle: true,
    metrics: [
      {
        id: 'bp', title: 'Blood Pressure', unit: 'mmHg',
        lastRecorded: '03/05/2024 • Apple Watch', type: 'range', shapeStyle: 'bp',
        yDomain: [0, 160], yTicks: [0, 40, 80, 120, 160], xLabel: 'Days',
        legend: ['Sys', 'Dia'],
        stats: [
          { val: '120/80', unit: 'mmHg', label: 'Weekly Avg' },
          { val: '105–140', unit: 'mmHg', label: 'Range' },
          { val: '65–95', unit: 'mmHg', label: 'Diastolic' },
        ],
        data: {
          '1D': [
            { t: '9am',  dia: 78, range: 44 }, { t: '11am', dia: 80, range: 42 },
            { t: '1pm',  dia: 82, range: 38 }, { t: '3pm',  dia: 79, range: 43 },
            { t: '5pm',  dia: 81, range: 39 }, { t: '7pm',  dia: 77, range: 45 },
          ],
          '1W': [
            { t: '12 Mar', dia: 80, range: 40 }, { t: '13 Mar', dia: 85, range: 45 },
            { t: '14 Mar', dia: 75, range: 40 }, { t: '15 Mar', dia: 80, range: 45 },
            { t: '16 Mar', dia: 78, range: 40 }, { t: '17 Mar', dia: 76, range: 46 },
          ],
          '3W': [
            { t: 'Feb 26', dia: 78, range: 42 }, { t: 'Mar 5',  dia: 80, range: 40 },
            { t: 'Mar 12', dia: 82, range: 38 }, { t: 'Mar 17', dia: 76, range: 46 },
          ],
        },
      },
      {
        id: 'spo2', title: 'Blood Oxygen', unit: '%',
        lastRecorded: '03/05/2024 • Apple Watch', type: 'line',
        yDomain: [85, 100], yTicks: [85, 90, 95, 100], xLabel: 'Days',
        stats: [
          { val: '94', unit: '%', label: 'Weekly Avg' },
          { val: '93–99', unit: '%', label: 'Range' },
        ],
        data: {
          '1D': [
            { t: '9am',  v: 97 }, { t: '11am', v: 96 },
            { t: '1pm',  v: 98 }, { t: '3pm',  v: 95 },
            { t: '5pm',  v: 97 }, { t: '7pm',  v: 96 },
          ],
          '1W': [
            { t: '12 Mar', v: 97 }, { t: '13 Mar', v: 95 },
            { t: '14 Mar', v: 98 }, { t: '15 Mar', v: 96 },
            { t: '16 Mar', v: 97 }, { t: '17 Mar', v: 95 },
          ],
          '3W': [
            { t: 'Feb 26', v: 96 }, { t: 'Mar 5',  v: 97 },
            { t: 'Mar 12', v: 95 }, { t: 'Mar 17', v: 98 },
          ],
        },
      },
    ],
  },
  {
    id: 'biomarkers', title: 'Biomarkers', showRangeToggle: false,
    metrics: [
      {
        id: 'bg', title: 'Blood Glucose (Daily Average)', unit: 'mg/dL',
        lastRecorded: '03/05/2024 9:30 AM • Libre',
        subtitle: 'Data available for 5/7 Days',
        type: 'line',
        yDomain: [0, 300], yTicks: [0, 100, 200, 300], xLabel: 'Hours',
        stats: [
          { val: '112', unit: 'mg/dL', label: 'Weekly Avg' },
          { val: '66–217', unit: 'mg/dL', label: 'Range' },
        ],
        data: {
          '1D': [
            { t: '12am', v: 130 }, { t: '3am', v: 108 }, { t: '6am',  v: 115 },
            { t: '9am',  v: 185 }, { t: '12pm', v: 245 }, { t: '3pm', v: 175 },
            { t: '6pm',  v: 130 }, { t: '9pm',  v: 150 },
          ],
          '1W': [
            { t: 'Mon', v: 112 }, { t: 'Tue', v: 135 }, { t: 'Wed', v: 108 },
            { t: 'Thu', v: 155 }, { t: 'Fri', v: 125 }, { t: 'Sat', v: 148 }, { t: 'Sun', v: 118 },
          ],
          '3W': [
            { t: 'W1', v: 120 }, { t: 'W2', v: 138 }, { t: 'W3', v: 112 },
          ],
        },
      },
    ],
  },
  {
    id: 'activity', title: 'Activity', showRangeToggle: false,
    metrics: [
      {
        id: 'steps', title: 'Steps', unit: 'steps',
        lastRecorded: '03/05/2024 • Fitbit',
        type: 'line',
        yDomain: [0, 12000], yTicks: [0, 4000, 8000, 12000], xLabel: 'Days',
        stats: [
          { val: '5,962', unit: 'steps', label: 'Weekly Avg' },
          { val: '4,321–7,890', unit: 'steps', label: 'Range' },
        ],
        data: {
          '1D': [
            { t: '6am', v: 450 }, { t: '9am', v: 2100 }, { t: '12pm', v: 4200 },
            { t: '3pm', v: 5800 }, { t: '6pm', v: 7200 }, { t: '9pm', v: 7890 },
          ],
          '1W': [
            { t: 'Mon', v: 5675 }, { t: 'Tue', v: 4321 }, { t: 'Wed', v: 7890 },
            { t: 'Thu', v: 6200 }, { t: 'Fri', v: 5400 }, { t: 'Sat', v: 8100 }, { t: 'Sun', v: 4800 },
          ],
          '3W': [
            { t: 'W1', v: 5200 }, { t: 'W2', v: 6100 }, { t: 'W3', v: 5962 },
          ],
        },
      },
    ],
  },
];

// ── Custom range bar shapes ───────────────────────────────────────────────────

function makeRangeShape(topColor, botColor, shapeStyle) {
  return function RangeShape({ x, y, width, height }) {
    if (!height || height <= 0 || width == null) return null;
    const cx = x + width / 2;

    if (shapeStyle === 'bar') {
      // Thin filled capsule bar (Blood Oxygen style)
      const bw = 4;
      return <rect x={cx - bw / 2} y={y} width={bw} height={Math.max(height, 1)} fill={topColor} rx={2} />;
    }

    // 'bp' style: line + circle top + diamond bottom
    const ds = 3.5;
    return (
      <g>
        <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={topColor} strokeWidth={1.5} />
        <circle cx={cx} cy={y} r={3.5} fill={topColor} />
        <path
          d={`M${cx},${y + height - ds} L${cx + ds},${y + height} L${cx},${y + height + ds} L${cx - ds},${y + height} Z`}
          fill={botColor}
        />
      </g>
    );
  };
}

// ── Metric Chart ─────────────────────────────────────────────────────────────

function MetricChart({ metric, range, colors }) {
  const { topColor, botColor, lineColor, gridColor, axisColor } = colors;
  const data = metric.data[range] || metric.data['1W'];
  const RangeShape = makeRangeShape(topColor, botColor, metric.shapeStyle || 'bp');

  const axisProps = {
    tick: { fontSize: 'var(--font-xs)', fill: axisColor, fontFamily: 'Inter, sans-serif' },
    axisLine: false,
    tickLine: false,
  };

  const innerChart = metric.type === 'range' ? (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="none" />
        <XAxis dataKey="t" {...axisProps} />
        <YAxis domain={metric.yDomain} ticks={metric.yTicks} width={40} {...axisProps} tick={{ ...axisProps.tick, dy: 0 }} />
        <Bar dataKey="dia" stackId="r" fill="transparent" stroke="none" isAnimationActive={false} barSize={24} />
        <Bar dataKey="range" stackId="r" shape={<RangeShape />} fill="transparent" stroke="none" isAnimationActive={false} barSize={24} />
      </ComposedChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="none" />
        <XAxis dataKey="t" {...axisProps} />
        <YAxis domain={metric.yDomain} ticks={metric.yTicks} width={40} {...axisProps} />
        <Bar dataKey="__dummy" fill="transparent" stroke="none" isAnimationActive={false} barSize={1} />
        <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.5}
          dot={{ r: 2.5, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 4, fill: lineColor }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <div className={styles.chartArea}>
      <span className={styles.yLabel}>{metric.unit}</span>
      <div className={styles.chartAreaInner}>{innerChart}</div>
    </div>
  );
}

// ── Table View ───────────────────────────────────────────────────────────────

function TableView({ onOpenGraph }) {
  return (
    <div className={styles.tableView}>
      {TABLE_SECTIONS.map(section => (
        <div key={section.id} className={styles.tableSection}>
          <div className={styles.tableSectionHeader}>
            <span className={styles.tableSectionTitle}>{section.title}</span>
            <div className={styles.tableSectionActions}>
              <button className={styles.graphIconBtn} onClick={() => onOpenGraph(section.id)} title="View graphs">
                <GraphIcon />
              </button>
              <span className={styles.sectionActionDivider} />
              <button className={styles.addIconBtn} title="Add">
                <AddIcon />
              </button>
            </div>
          </div>

          <div className={styles.colHeader}>
            <span className={styles.colNameLabel}>Name</span>
            <span className={styles.colValuesLabel}>Values</span>
          </div>

          {section.rows.map(row => (
            <div key={row.id} className={styles.row}>
              <div className={styles.nameCell}>
                <div className={styles.nameRow}>
                  <span className={styles.rowName}>{row.name}</span>
                  {row.hasPin && <TrendIcon />}
                </div>
                <span className={styles.rowUnit}>{row.unit}</span>
              </div>
              <div className={styles.valuesCell}>
                {row.values.map((val, i) => (
                  <div key={i} className={styles.valueItem}>
                    <span className={`${styles.val} ${val.flag ? styles.valFlag : ''}`}>{val.v}</span>
                    <span className={styles.valDate}>{val.date}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Graph View ───────────────────────────────────────────────────────────────

function GraphView({ onClose }) {
  const [range, setRange] = useState('1W');

  const topColor  = cssVar('--chart-1');
  const botColor  = cssVar('--chart-2');
  const lineColor = cssVar('--chart-1');
  const gridColor = cssVar('--neutral-100');
  const axisColor = cssVar('--neutral-300');
  const colors = { topColor, botColor, lineColor, gridColor, axisColor };

  return (
    <div className={styles.graphView}>
      {GRAPH_SECTIONS.map(section => (
        <div key={section.id}>
          <div className={styles.graphSectionHeader}>
            <span className={styles.graphSectionTitle}>{section.title}</span>
            {section.showRangeToggle && (
              <Toggle items={['1D', '1W', '3W']} active={range} onChange={setRange} size="S" />
            )}
            {section.id === GRAPH_SECTIONS[0].id && (
              <button className={styles.listIconBtn} onClick={onClose} title="Back to list">
                <ListIcon />
              </button>
            )}
            <button className={styles.addIconBtn} title="Add">
              <AddIcon />
            </button>
          </div>

          {section.metrics.map(metric => (
            <div key={metric.id} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div className={styles.metricTitleGroup}>
                  <span className={styles.metricTitle}>{metric.title}</span>
                  <span className={styles.metricSub}>Last Recorded on {metric.lastRecorded}</span>
                  {metric.subtitle && <span className={styles.metricSub}>{metric.subtitle}</span>}
                </div>
                {metric.legend && (
                  <div className={styles.legend}>
                    <span className={styles.legendCircle} style={{ background: topColor }} />
                    <span className={styles.legendLabel}>{metric.legend[0]}</span>
                    <span className={styles.legendDiamond} style={{ background: botColor }} />
                    <span className={styles.legendLabel}>{metric.legend[1]}</span>
                  </div>
                )}
              </div>

              <div className={styles.chartWrap}>
                <MetricChart metric={metric} range={range} colors={colors} />
                <div className={styles.xAxisLabel}>{metric.xLabel}</div>
              </div>

              <div className={styles.statsBar}>
                {metric.stats.flatMap((stat, i) => [
                  i > 0 ? <span key={`d${i}`} className={styles.statDivider} /> : null,
                  <div key={`s${i}`} className={styles.statItem}>
                    <span className={styles.statLine}>
                      <span className={styles.statValue}>{stat.val}</span>
                      {stat.unit && <span className={styles.statUnit}> {stat.unit}</span>}
                    </span>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>,
                ])}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function VitalsLabsTab() {
  const [graphOpen, setGraphOpen] = useState(false);
  return (
    <div className={styles.wrapper}>
      {graphOpen
        ? <GraphView onClose={() => setGraphOpen(false)} />
        : <TableView onOpenGraph={() => setGraphOpen(true)} />
      }
    </div>
  );
}
