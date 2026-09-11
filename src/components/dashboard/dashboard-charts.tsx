"use client";

import { useRef, useEffect, useMemo, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import type { ProvinceStudentCount, ProvinceYearTrendPoint, ProvinceCoverage } from "@/server";

const GREEN = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];

export const StudentsByProvinceChart = memo(function StudentsByProvinceChart({ data }: { data: ProvinceStudentCount[] }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={top} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F7EE" horizontal={false} />
        <XAxis type="number" stroke="#94A3B8" fontSize={12} />
        <YAxis type="category" dataKey="provinceName" stroke="#475569" fontSize={12} width={110} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D1FAE5" }} />
        <Bar dataKey="studentCount" fill="#059669" radius={[0, 8, 8, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const ProvinceShareChart = memo(function ProvinceShareChart({ data }: { data: ProvinceStudentCount[] }) {
  const top = data.slice(0, 6);
  const rest = data.slice(6).reduce((sum, d) => sum + d.studentCount, 0);
  const chartData = rest > 0 ? [...top, { provinceName: "Others", studentCount: rest }] : top;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="studentCount"
          nameKey="provinceName"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={GREEN[i % GREEN.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D1FAE5" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={pivoted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F7EE" />
        <XAxis dataKey="schoolYear" stroke="#94A3B8" fontSize={12} />
        <YAxis stroke="#94A3B8" fontSize={12} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D1FAE5" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {provinces.map((p, i) => (
          <Line key={p} type="monotone" dataKey={p} stroke={GREEN[i % GREEN.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

export const CoverageList = memo(function CoverageList({ data }: { data: ProvinceCoverage[] }) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => a.coveragePercent - b.coveragePercent).slice(0, 8);
  }, [data]);

  return (
    <div className="space-y-3">
      {sorted.map((p) => (
        <div key={p.provinceId}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{p.provinceName}</span>
            <span className="text-slate-400">
              {p.studentsWithSubmissions}/{p.totalStudents} · {p.coveragePercent}%
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-50">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(p.coveragePercent, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});