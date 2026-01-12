"use strict";

const tools = {
    calculatorEnabled: false,
    calendarNotifsEnabled: false,
    currentDate: new Date(),

    init() {
        const savedCalc = localStorage.getItem('udt_tool_calc');
        const savedCal = localStorage.getItem('udt_tool_cal');

        if (savedCalc === 'true') {
            this.calculatorEnabled = true;
            document.getElementById('tool-calc-toggle').checked = true;
            this.showCalculator(true);
        }

        if (savedCal === 'true') {
            this.calendarNotifsEnabled = true;
            document.getElementById('tool-cal-toggle').checked = true;
            this.toggleHeaderCalendar(true);
            this.checkCalendarNotifs();
        }
    },

    toggleCalculator() {
        this.calculatorEnabled = !this.calculatorEnabled;
        localStorage.setItem('udt_tool_calc', this.calculatorEnabled);
        this.showCalculator(this.calculatorEnabled);
    },

    toggleCalendarNotifs() {
        this.calendarNotifsEnabled = !this.calendarNotifsEnabled;
        localStorage.setItem('udt_tool_cal', this.calendarNotifsEnabled);
        this.toggleHeaderCalendar(this.calendarNotifsEnabled);
        if (this.calendarNotifsEnabled) this.checkCalendarNotifs();
    },

    toggleHeaderCalendar(show) {
        const btn = document.getElementById('header-cal-btn');
        if (btn) btn.style.display = show ? 'block' : 'none';
    },

    showCalculator(show) {
        const el = document.getElementById('calculator-widget');
        if (el) el.style.display = show ? 'block' : 'none';
        if (show) calc.resetIdle();
    },

    /* --- CALENDAR LOGIC --- */
    openCalendar() {
        document.getElementById('calendar-modal').style.display = 'flex';
        this.renderCalendar(this.currentDate);
    },

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar(this.currentDate);
    },

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar(this.currentDate);
    },

    renderCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        document.getElementById('cal-month-year').innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = document.getElementById('cal-days');
        grid.innerHTML = '';

        // Fetch "booked" transactions for this month
        const events = this.getEventsForMonth(year, month);

        // Blank cells before first day
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += '<div></div>';
        }

        const today = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = d;

            // Check for today
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            // Check for events
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (events[dateStr]) {
                dayDiv.classList.add('has-event');
                dayDiv.onclick = () => this.showEventDetails(dateStr, events[dateStr]);
            }

            grid.appendChild(dayDiv);
        }

        document.getElementById('cal-event-detail').style.display = 'none';
    },

    getEventsForMonth(year, month) {
        const txs = state.getTransactions();
        const eventMap = {};

        txs.forEach(t => {
            if (t.status === 'booked' && t.promiseDate) {
                const d = new Date(t.promiseDate);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    if (!eventMap[t.promiseDate]) eventMap[t.promiseDate] = [];
                    eventMap[t.promiseDate].push(t);
                }
            }
        });
        return eventMap;
    },

    showEventDetails(dateStr, events) {
        const box = document.getElementById('cal-event-detail');
        box.style.display = 'block';
        box.innerHTML = `<strong>Work Due on ${dateStr}:</strong><br>`;

        events.forEach(t => {
            box.innerHTML += `
                <div style="margin-top:5px; border-bottom:1px solid #eee; padding-bottom:3px;">
                    • ${t.name} - ${t.product} (${t.qty})<br>
                    <span style="color:#dc2626; font-size:0.8rem;">Due: ₹${(Number(t.amount) || 0) - (Number(t.paidAmount) || 0)}</span>
                </div>
            `;
        });
    },

    checkCalendarNotifs() {
        const todayStr = new Date().toISOString().split('T')[0];
        const pending = state.getTransactions().filter(t => t.status === 'booked' && t.promiseDate === todayStr);
        if (pending.length > 0) {
            showToast(`Task Alert: ${pending.length} settlement(s) due today!`, 'warning');

            // Add red dot to calendar icon
            const btn = document.getElementById('header-cal-btn');
            if (btn && !document.getElementById('cal-dot')) {
                const dot = document.createElement('div');
                dot.id = 'cal-dot';
                dot.style.cssText = "position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:red; border-radius:50%; border:2px solid white;";
                btn.appendChild(dot);
            }
        }
    }
};

const calc = {
    display: document.getElementById('calc-current'),
    history: document.getElementById('calc-history'),
    current: '0',
    prev: '',
    operation: null,
    historyLog: [],
    idleTimer: null,

    num(n) {
        this.resetIdle();
        if (this.current === '0' && n !== '.') this.current = '';
        if (n === '.' && this.current.includes('.')) return;
        this.current += n.toString();
        this.updateDisplay();
    },

    op(o) {
        this.resetIdle();
        if (this.current === '') return;
        if (this.prev !== '') this.calculate();
        this.operation = o;
        this.prev = this.current;
        this.current = '';
        this.updateDisplay(true);
    },

    calculate() {
        this.resetIdle();
        let computation;
        const p = parseFloat(this.prev);
        const c = parseFloat(this.current);
        if (isNaN(p) || isNaN(c)) return;

        switch (this.operation) {
            case '+': computation = p + c; break;
            case '-': computation = p - c; break;
            case '*': computation = p * c; break;
            case '/': computation = p / c; break;
            case '%': computation = p % c; break;
            default: return;
        }

        this.historyLog.push(`${p} ${this.operation} ${c} = ${computation}`);
        this.current = computation.toString();
        this.operation = null;
        this.prev = '';
        this.updateDisplay();
    },

    clear() {
        this.resetIdle();
        this.current = '0';
        this.prev = '';
        this.operation = null;
        this.updateDisplay();
    },

    undo() {
        this.resetIdle();
        this.current = this.current.toString().slice(0, -1);
        if (this.current === '') this.current = '0';
        this.updateDisplay();
    },

    updateDisplay(showOp = false) {
        const disp = document.getElementById('calc-current');
        const hist = document.getElementById('calc-history');
        if (disp) disp.innerText = this.current;
        if (hist) hist.innerText = showOp ? `${this.prev} ${this.operation}` : (this.historyLog[this.historyLog.length - 1] || '');
    },

    resetIdle() {
        const widget = document.getElementById('calculator-widget');
        if (widget) {
            widget.classList.remove('minimized');
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                widget.classList.add('minimized');
            }, 5000); // 5 seconds auto-hide logic (Faster as requested)
        }
    }
};

// Initialize tools on load
document.addEventListener('DOMContentLoaded', () => {
    tools.init();

    // Add hover listener to wake calculator
    const widget = document.getElementById('calculator-widget');
    if (widget) {
        widget.addEventListener('mouseenter', () => calc.resetIdle());
    }
});
