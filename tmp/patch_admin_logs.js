const fs = require('fs');
const filePath = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';
const content = fs.readFileSync(filePath, 'utf8');

const startTag = "function renderLogs(l) {";
const endTag = "lucide.createIcons();"; 

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const closingBraceIndex = content.indexOf('}', endIndex);
    
    if (closingBraceIndex !== -1) {
        const prefix = content.substring(0, startIndex);
        const suffix = content.substring(closingBraceIndex + 1);
        
        const newRenderLogs = `function renderLogs(l) {
            const tableBody = document.getElementById('table-logs-body');
            if (!l || l.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="py-10 text-center text-slate-400 font-bold italic">No attendance records found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = l.map(log => {
                const dur = log.durationMinutes || (log.in_time && log.out_time ? calculateMins(log.in_time, log.out_time) : 0);
                const durationText = dur ? \`\${dur} mins\` : '--';
                const dateDisplay = fmtDate(log.date);
                const checkinDisplay = fmtTime(log.in_time);
                const checkoutDisplay = log.out_time ? fmtTime(log.out_time) : '--:--';
                
                const isAuto = log.source === 'auto' || !log.source;
                const sourceBadge = isAuto 
                    ? \`<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-extrabold uppercase border border-emerald-100/50">Auto</span>\`
                    : \`<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-extrabold uppercase border border-amber-100/50">Manual</span>\`;

                const isPresent = log.status === 'Present';
                const statusText = isPresent ? 'Present' : 'Absent';
                const badgeClass = isPresent
                    ? 'px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase border border-emerald-100/50'
                    : 'px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase border border-rose-100/50';

                return \`
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-4 px-8 text-sm font-bold text-slate-800">\${dateDisplay}</td>
                        <td class="py-4 px-8">
                            <div class="font-bold text-slate-900 text-sm">\${log.name || 'Unknown'}</div>
                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">\${log.roll_number || ''}</div>
                        </td>
                        <td class="py-4 px-8 text-sm font-bold text-emerald-600">\${checkinDisplay}</td>
                        <td class="py-4 px-8 text-sm font-bold text-slate-400">\${checkoutDisplay}</td>
                        <td class="py-4 px-8">
                            <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">\${durationText}</span>
                        </td>
                        <td class="py-4 px-8 text-center">\${sourceBadge}</td>
                        <td class="py-4 px-8">
                            <span class="\${badgeClass}">\${statusText}</span>
                        </td>
                        <td class="py-4 px-8 text-right">
                            <button onclick="openEditModal(\${log.id})" class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all tooltip" title="Edit Record">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                        </td>
                    </tr>
                \`;
            }).join('');
            lucide.createIcons();
        }`;
        
        fs.writeFileSync(filePath, prefix + newRenderLogs + suffix, 'utf8');
        console.log("Successfully patched renderLogs!");
    } else {
        console.log("Could not find closing brace for renderLogs.");
    }
} else {
    console.log("Could not find start or end tag for renderLogs.");
}
