"use client";

import { useMemo, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import type { ProvinceStudentCount, ProvinceYearTrendPoint, ProvinceCoverage } from "@/server";

const GREEN = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];
const AXIS_TICK = { fill: "#94A3B8", fontSize: 11 };
const GRID_STROKE = "#E2E8F0";

type TooltipPayloadItem = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
};

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      {label !== undefined && label !== "" ? (
        <p className="mb-1 text-[11px] font-semibold text-slate-500">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? "#059669" }}
            />
            <span className="max-w-[160px] truncate text-slate-600">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-900">
              {entry.value}
              {suffix ? ` ${suffix}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const StudentsByProvinceChart = memo(function StudentsByProvinceChart({ data }: { data: ProvinceStudentCount[] }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="barProvinceGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="provinceName" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
        <Tooltip cursor={{ fill: "rgba(16, 185, 129, 0.06)" }} content={<ChartTooltip suffix="students" />} />
        <Bar dataKey="studentCount" name="Students" fill="url(#barProvinceGradient)" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const ProvinceShareChart = memo(function ProvinceShareChart({ data }: { data: ProvinceStudentCount[] }) {
  const top = data.slice(0, 6);
  const rest = data.slice(6).reduce((sum, d) => sum + d.studentCount, 0);
  const chartData = rest > 0 ? [...top, { provinceName: "Others", studentCount: rest }] : top;
  const total = chartData.reduce((sum, d) => sum + d.studentCount, 0);

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="studentCount"
            nameKey="provinceName"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            cornerRadius={4}
            strokeWidth={2}
            stroke="#ffffff"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={GREEN[index % GREEN.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip suffix="students" />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
        <p className="text-2xl font-bold tracking-tight text-slate-900">{total.toLocaleString()}</p>
        <p className="text-[11px] font-medium text-slate-500">students</p>
      </div>
    </div>
  );
});

export const ProvinceYearTrendChart = memo(function ProvinceYearTrendChart({ data }: { data: ProvinceYearTrendPoint[] }) {
  // Optimized: Build lookup map instead of O(n²) find() in loop
  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      map.set(`${d.schoolYear}:${d.provinceName}`, d.studentCount);
    });
    return map;
  }, [data]);

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    data.forEach((d) => uniqueYears.add(d.schoolYear));
    return Array.from(uniqueYears).sort();
  }, [data]);

  const provinces = useMemo(() => {
    const uniqueProvinces = new Set<string>();
    data.forEach((d) => uniqueProvinces.add(d.provinceName));
    return Array.from(uniqueProvinces).slice(0, 5);
  }, [data]);

  const pivoted = useMemo(() => {
    return years.map((year) => {
      const row: Record<string, string | number> = { schoolYear: year };
      provinces.forEach((p) => {
        row[p] = lookup.get(`${year}:${p}`) ?? 0;
      });
      return row;
    });
  }, [years, provinces, lookup]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={pivoted} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="schoolYear" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip suffix="students" />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {provinces.map((province, index) => (
          <Line
            key={province}
            type="monotone"
            dataKey={province}
            stroke={GREEN[index % GREEN.length]}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

function coverageTone(percent: number) {
  if (percent >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600" };
  if (percent >= 50) return { bar: "bg-amber-400", text: "text-amber-600" };
  return { bar: "bg-rose-400", text: "text-rose-500" };
}

export const CoverageList = memo(function CoverageList({ data }: { data: ProvinceCoverage[] }) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => a.coveragePercent - b.coveragePercent).slice(0, 8);
  }, [data]);

  return (
    <div className="space-y-3.5">
      {sorted.map((province) => {
        const tone = coverageTone(province.coveragePercent);
        return (
          <div key={province.provinceId}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium text-slate-700">{province.provinceName}</span>
              <span className={`text-xs font-semibold ${tone.text}`}>
                {province.coveragePercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${tone.bar}`}
                  style={{ width: `${Math.min(province.coveragePercent, 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">
                {province.studentsWithSubmissions}/{province.totalStudents}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

