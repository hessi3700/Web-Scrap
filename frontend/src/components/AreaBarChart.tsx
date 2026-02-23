import { useEffect, useRef } from "react";

export interface AreaCount {
  area: string;
  count: number;
}

const BAR_COLOR = "#38bdf8";
const BAR_COLOR_HOVER = "#7dd3fc";
const MAX_BARS = 12;

export default function AreaBarChart({ data, height = 220 }: { data: AreaCount[]; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 400;
    const margin = { top: 12, right: 12, bottom: 28, left: 52 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const xScale = (i: number) => (i / Math.max(data.length - 1, 1)) * innerWidth;
    const yScale = (v: number) => innerHeight - (v / maxCount) * innerHeight;
    const barWidth = Math.max(6, (innerWidth / data.length) * 0.7);

    // Clear previous
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);

    // Y axis
    const yTicks = [0, Math.ceil(maxCount / 2), maxCount].filter((_, i, a) => a.indexOf(_) === i);
    yTicks.forEach((v) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(innerWidth));
      line.setAttribute("y1", String(yScale(v)));
      line.setAttribute("y2", String(yScale(v)));
      line.setAttribute("stroke", "rgba(148,163,184,0.2)");
      line.setAttribute("stroke-width", "1");
      g.appendChild(line);
    });
    yTicks.forEach((v) => {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "-6");
      text.setAttribute("y", String(yScale(v) + 4));
      text.setAttribute("text-anchor", "end");
      text.setAttribute("fill", "#94a3b8");
      text.setAttribute("font-size", "10");
      text.textContent = String(v);
      g.appendChild(text);
    });

    // Bars (D3-style manual layout)
    data.slice(0, MAX_BARS).forEach((d, i) => {
      const x = xScale(i) + (innerWidth / Math.max(data.length, 1) - barWidth) / 2;
      const barH = innerHeight - yScale(d.count);
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(yScale(d.count)));
      rect.setAttribute("width", String(barWidth));
      rect.setAttribute("height", String(Math.max(barH, 0)));
      rect.setAttribute("fill", BAR_COLOR);
      rect.setAttribute("rx", "3");
      rect.setAttribute("data-area", d.area);
      rect.addEventListener("mouseenter", () => {
        rect.setAttribute("fill", BAR_COLOR_HOVER);
      });
      rect.addEventListener("mouseleave", () => {
        rect.setAttribute("fill", BAR_COLOR);
      });
      g.appendChild(rect);
    });

    // X labels
    data.slice(0, MAX_BARS).forEach((d, i) => {
      const x = xScale(i) + (innerWidth / Math.max(data.length, 1)) / 2;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(innerHeight + 18));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#94a3b8");
      text.setAttribute("font-size", "10");
      text.textContent = d.area.length > 10 ? d.area.slice(0, 9) + "…" : d.area;
      g.appendChild(text);
    });

    svg.appendChild(g);
  }, [data, height]);

  if (data.length === 0) return null;

  return (
    <svg ref={svgRef} width="100%" height={height} className="overflow-visible" style={{ minHeight: height }} />
  );
}
