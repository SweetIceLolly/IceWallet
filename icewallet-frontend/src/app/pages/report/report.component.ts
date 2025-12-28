import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { EntryController } from '../../controllers/entry.controller';
import { AppStorageController } from '../../controllers/appstorage.controller';

Chart.register(...registerables);

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;
  monthlyData: MonthlyData[] = [];
  isLoading: boolean = true;
  loadError: string = '';

  // Year selection
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Totals
  totalIncome: number = 0;
  totalExpense: number = 0;
  totalNet: number = 0;

  // Chart type
  chartType: 'bar' | 'line' = 'bar';
  chartView: 'incomeExpense' | 'netIncome' = 'incomeExpense';

  constructor(
    private entryCtrl: EntryController,
    private appStorageCtrl: AppStorageController,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if the user is logged in
    if (!this.appStorageCtrl.getLoginToken()) {
      this.router.navigate(['/login']);
      return;
    }

    // Generate available years (current year and 5 years back)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 5; i++) {
      this.availableYears.push(currentYear - i);
    }
  }

  ngAfterViewInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      // Use the efficient backend endpoint that aggregates data in MongoDB
      const result = await this.entryCtrl.getMonthlyReport(this.selectedYear);
      
      // Process the aggregated data from backend
      this.processMonthlyData(result.monthlyData || []);
      this.calculateTotals();
    } catch (error: any) {
      this.loadError = error?.message || 'Failed to load data';
    } finally {
      this.isLoading = false;
      // Defer chart rendering to next tick to ensure canvas is available after *ngIf updates
      setTimeout(() => this.renderChart(), 0);
    }
  }

  processMonthlyData(backendData: { month: number, income: number, expense: number }[]): void {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Map backend data (1-indexed months) to frontend format
    this.monthlyData = monthNames.map((monthName, index) => {
      const monthData = backendData.find(d => d.month === index + 1);
      const income = monthData?.income || 0;
      const expense = monthData?.expense || 0;
      return {
        month: monthName,
        income,
        expense,
        net: income - expense
      };
    });
  }

  calculateTotals(): void {
    this.totalIncome = this.monthlyData.reduce((sum, data) => sum + data.income, 0);
    this.totalExpense = this.monthlyData.reduce((sum, data) => sum + data.expense, 0);
    this.totalNet = this.totalIncome - this.totalExpense;
  }

  renderChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const labels = this.monthlyData.map(d => d.month.substring(0, 3));

    if (this.chartView === 'netIncome') {
      this.renderNetIncomeChart(ctx, labels);
    } else {
      this.renderIncomeExpenseChart(ctx, labels);
    }
  }

  renderIncomeExpenseChart(ctx: CanvasRenderingContext2D, labels: string[]): void {
    const incomeData = this.monthlyData.map(d => d.income);
    const expenseData = this.monthlyData.map(d => d.expense);

    this.chart = new Chart(ctx, {
      type: this.chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: 'rgba(33, 150, 243, 0.6)',
            borderColor: 'rgba(33, 150, 243, 1)',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Expense',
            data: expenseData,
            backgroundColor: 'rgba(244, 67, 54, 0.6)',
            borderColor: 'rgba(244, 67, 54, 1)',
            borderWidth: 2,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Monthly Income & Expense - ${this.selectedYear}`,
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: $${value?.toFixed(2) ?? '0.00'}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${value}`
            }
          }
        }
      }
    });
  }

  renderNetIncomeChart(ctx: CanvasRenderingContext2D, labels: string[]): void {
    const netData = this.monthlyData.map(d => d.net);
    const backgroundColors = netData.map(value => 
      value >= 0 ? 'rgba(76, 175, 80, 0.6)' : 'rgba(244, 67, 54, 0.6)'
    );
    const borderColors = netData.map(value => 
      value >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
    );

    this.chart = new Chart(ctx, {
      type: this.chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Net Income',
            data: netData,
            backgroundColor: this.chartType === 'bar' ? backgroundColors : 'rgba(76, 175, 80, 0.6)',
            borderColor: this.chartType === 'bar' ? borderColors : 'rgba(76, 175, 80, 1)',
            borderWidth: 2,
            tension: 0.3,
            segment: this.chartType === 'line' ? {
              borderColor: (ctx: any) => {
                const value = ctx.p1.parsed.y;
                return value >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)';
              }
            } : undefined,
            pointBackgroundColor: this.chartType === 'line' ? backgroundColors : undefined,
            pointBorderColor: this.chartType === 'line' ? borderColors : undefined
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Monthly Net Income - ${this.selectedYear}`,
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                const sign = value >= 0 ? '+' : '';
                return `Net: ${sign}$${value.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `$${value}`
            }
          }
        }
      }
    });
  }

  onYearChange(): void {
    this.loadData();
  }

  onChartTypeChange(): void {
    this.renderChart();
  }

  onChartViewChange(): void {
    this.renderChart();
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }
}
