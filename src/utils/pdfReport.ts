import type { WorkOrder, Device, Technician, MaterialItem } from '@/types';

function fmtDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtMoney(n: number): string {
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function genWONo(id: string): string {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `WO${String(20260000 + (h % 9999)).padStart(8, '0')}`;
}

function genRPTNo(id: string): string {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `RPT-${String(2026060000 + (h % 9999)).padStart(10, '0')}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReportHTML(
  wo: WorkOrder,
  device: Device,
  tech: Technician | null,
  materials: MaterialItem[],
  rating: number | null,
  feedback: string | null,
): string {
  const woNo = genWONo(wo.id);
  const rptNo = genRPTNo(wo.id);
  const totalCost = materials.reduce((s, m) => s + m.quantity * m.unit_price, 0);
  const downtimeMins = wo.downtime_minutes || 0;
  const downtimeH = Math.floor(downtimeMins / 60);
  const downtimeM = downtimeMins % 60;
  const techName = tech?.name || '技师';
  const techPhone = tech?.phone || '--';
  const techRating = tech?.rating?.toFixed(1) || '4.8';
  const note = wo.maintenance_note || '无';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>保养验收报告 ${woNo}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; color: #1A1D23; font-size: 11px; line-height: 1.6; }
  .header { background: #FF6B1A; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin: -20mm -20mm 16px -20mm; padding: 12px 20mm; }
  .header h1 { font-size: 14px; font-weight: 700; letter-spacing: 0.05em; }
  .header .rpt-no { font-family: monospace; font-size: 10px; opacity: 0.85; }
  h2 { font-size: 13px; font-weight: 700; padding-left: 10px; border-left: 3px solid #FF6B1A; margin: 18px 0 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .info-row { display: flex; gap: 6px; }
  .info-label { color: #8A8F98; min-width: 70px; flex-shrink: 0; }
  .info-value { font-weight: 500; }
  .info-value.highlight { color: #FF6B1A; font-weight: 700; font-family: monospace; }
  .info-value.danger { color: #EF4444; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F9FAFB; text-align: left; padding: 6px 8px; font-size: 10px; color: #8A8F98; font-weight: 600; border-bottom: 1px solid #E5E7EB; }
  td { padding: 6px 8px; border-bottom: 1px solid #F3F4F6; font-size: 10px; }
  td.mono { font-family: monospace; }
  td.money { text-align: right; font-family: monospace; font-weight: 600; }
  tfoot td { border-top: 2px solid #1A1D23; padding-top: 8px; }
  .total { font-size: 16px; font-weight: 800; color: #FF6B1A; font-family: monospace; }
  .note-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 10px; white-space: pre-wrap; font-size: 10px; color: #374151; }
  .stars { color: #FF6B1A; font-size: 16px; letter-spacing: 2px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; color: #8A8F98; font-size: 9px; }
  .sig-line { border-bottom: 1px solid #1A1D23; display: inline-block; width: 160px; margin-left: 6px; }
  .downtime-big { font-size: 20px; font-weight: 800; color: #FF6B1A; font-family: monospace; }
  .downtime-unit { font-size: 11px; color: #8A8F98; margin-left: 4px; }
</style>
</head>
<body>
<div class="header">
  <h1>铁甲云维护 · 工程机械保养验收报告</h1>
  <span class="rpt-no">${rptNo}</span>
</div>

<div style="font-size:18px;font-weight:800;margin-bottom:4px;">保养验收报告</div>
<div style="color:#8A8F98;font-family:monospace;font-size:10px;margin-bottom:12px;">工单编号：${woNo}</div>

<h2>工单信息</h2>
<div class="info-grid">
  <div class="info-row"><span class="info-label">客户名称</span><span class="info-value">${esc(wo.client_name || '--')}</span></div>
  <div class="info-row"><span class="info-label">工地位置</span><span class="info-value">${esc(device.location_name || '--')}</span></div>
  <div class="info-row"><span class="info-label">作业日期</span><span class="info-value">${fmtDate(wo.arrived_at)} ${fmtTime(wo.arrived_at)} ~ ${fmtTime(wo.completed_at)}</span></div>
  <div class="info-row"><span class="info-label">工单状态</span><span class="info-value highlight">${wo.status}</span></div>
</div>

<h2>技师信息</h2>
<div class="info-grid">
  <div class="info-row"><span class="info-label">技师姓名</span><span class="info-value">${esc(techName)}</span></div>
  <div class="info-row"><span class="info-label">联系电话</span><span class="info-value mono">${esc(techPhone)}</span></div>
  <div class="info-row"><span class="info-label">评分</span><span class="info-value highlight">${techRating}</span></div>
  <div class="info-row"><span class="info-label">到达 / 离场</span><span class="info-value">${fmtTime(wo.arrived_at)} / ${fmtTime(wo.completed_at)}</span></div>
</div>
<div style="margin-top:8px;">
  <span class="info-label">停机时长</span>
  <span class="downtime-big">${downtimeH}</span><span class="downtime-unit">小时</span>
  <span class="downtime-big" style="margin-left:12px;">${String(downtimeM).padStart(2, '0')}</span><span class="downtime-unit">分钟</span>
</div>

<h2>设备信息</h2>
<div class="info-grid">
  <div class="info-row"><span class="info-label">设备编号</span><span class="info-value highlight mono">${esc(device.device_no)}</span></div>
  <div class="info-row"><span class="info-label">设备型号</span><span class="info-value">${esc(device.model)}</span></div>
  <div class="info-row"><span class="info-label">设备类型</span><span class="info-value">${esc(device.type)}</span></div>
  <div class="info-row"><span class="info-label">作业前/后小时</span><span class="info-value">${device.last_maintenance_hours.toLocaleString()}h → <span class="highlight">${device.current_hours.toLocaleString()}h</span></span></div>
  ${device.fault_code ? `<div class="info-row"><span class="info-label">故障码</span><span class="info-value danger">${esc(device.fault_code)}</span></div><div class="info-row"><span class="info-label">故障描述</span><span class="info-value">${esc(device.fault_name || '系统异常')}</span></div>` : ''}
</div>

<h2>用料费用明细</h2>
<table>
  <thead><tr><th>备件名称</th><th>零件号</th><th style="text-align:right">数量</th><th style="text-align:right">单价</th><th style="text-align:right">小计</th></tr></thead>
  <tbody>
    ${materials.map(m => `<tr><td>${esc(m.part_name)}</td><td class="mono">${esc(m.part_no)}</td><td class="money">×${m.quantity}</td><td class="money">${fmtMoney(m.unit_price)}</td><td class="money">${fmtMoney(m.quantity * m.unit_price)}</td></tr>`).join('\n')}
  </tbody>
  <tfoot><tr><td colspan="4" style="text-align:right;font-weight:700;">合计金额</td><td class="money total">${fmtMoney(totalCost)}</td></tr></tfoot>
</table>

<h2>保养说明</h2>
<div class="note-box">${esc(note)}</div>

${rating !== null ? `
<h2>客户评价</h2>
<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
  <span class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
  <span style="font-weight:700;color:#FF6B1A;">${rating}.0 分</span>
</div>
${feedback ? `<div class="note-box">${esc(feedback)}</div>` : ''}
` : ''}

<div class="footer">
  <div>客户确认签字：<span class="sig-line">&nbsp;</span></div>
  <div style="text-align:right">
    <div>报告生成：${new Date().toLocaleString('zh-CN')}</div>
    <div style="font-family:monospace;">报告编号：${rptNo}</div>
  </div>
</div>
</body>
</html>`;
}

export async function generatePDFReport(
  wo: WorkOrder,
  device: Device,
  tech: Technician | null,
  materials: MaterialItem[],
  rating: number | null,
  feedback: string | null,
): Promise<void> {
  const html = buildReportHTML(wo, device, tech, materials, rating, feedback);

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `保养验收报告_${genWONo(wo.id)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        resolve();
      }, 500);
    };
  });
}
