"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth } from "@/lib/api";
import BranchSelector from "@/components/BranchSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Award, 
  Package,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  UserCheck,
  BarChart3
} from "lucide-react";

interface AnalyticsData {
  // 營收數據
  revenue: {
    total: number;
    monthly: number;
    daily: number;
    trend: number; // 相比上期增長百分比
    actualDays?: number; // 實際天數
    byBranch: Array<{ branchId: string; branchName: string; amount: number }>;
    byService: Array<{ serviceId: string; serviceName: string; amount: number; count: number }>;
    byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  };
  
  // 會員數據
  members: {
    total: number;
    newThisMonth: number;
    activeMembers: number;
    byLevel: Array<{ level: string; count: number }>;
    topSpenders: Array<{ 
      userId: string; 
      userName: string; 
      totalSpent: number; 
      balance: number 
    }>;
    totalBalance: number;
  };
  
  // 預約數據
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
    byStatus: Array<{ status: string; count: number }>;
    byTimeSlot: Array<{ timeSlot: string; count: number }>;
  };
  
  // 刺青師績效
  artists: {
    total: number;
    topPerformers: Array<{
      artistId: string;
      artistName: string;
      revenue: number;
      completedServices: number;
      avgRating?: number;
    }>;
  };
  
  // 服務項目
  services: {
    total: number;
    topServices: Array<{
      serviceId: string;
      serviceName: string;
      bookingCount: number;
      completionRate: number;
      revenue: number;
    }>;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const fetchAnalyticsData = useCallback(async (): Promise<AnalyticsData | null> => {
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branchId', selectedBranchId);
      }
      params.append('dateRange', dateRange);
      
      const url = `/admin/analytics${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await getJsonWithAuth<AnalyticsData>(url);
      
      return data;
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      return null;
    }
  }, [selectedBranchId, dateRange]);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();

    if (!token || userRole !== 'BOSS') {
      router.replace('/admin/dashboard');
      return;
    }

    let isActive = true;

    const loadAnalytics = async () => {
      if (!isActive) return;
      
      setLoading(true);
      const data = await fetchAnalyticsData();
      
      if (!isActive) return;
      
      setAnalytics(data);
      setLoading(false);
    };

    loadAnalytics();

    return () => {
      isActive = false;
    };
  }, [router, fetchAnalyticsData, selectedBranchId, dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 animate-pulse"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">載入統計數據中</h3>
          <p className="text-muted text-sm">正在分析營收、會員、預約等數據...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted">無法載入統計數據</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getDateRangeLabel = () => {
    const labels = {
      '7d': '近7天',
      '30d': '近30天',
      '90d': '近90天',
      '1y': '近一年',
      'all': '累計'
    };
    return labels[dateRange] || '近30天';
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold dashboard-title">📊 統計報表</h1>
            <p className="mt-2 text-muted dashboard-subtitle">
              全方位數據分析與營運洞察
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 日期範圍選擇 */}
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '7d', label: '近7天' },
                { value: '30d', label: '近30天' },
                { value: '90d', label: '近90天' },
                { value: '1y', label: '近一年' },
                { value: 'all', label: '全部時間' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDateRange(range.value as '7d' | '30d' | '90d' | '1y' | 'all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range.value
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-surface text-text hover:bg-surface-elevated'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            
            {/* 分店選擇 */}
            <div className="w-full sm:w-[200px]">
              <BranchSelector
                selectedBranchId={selectedBranchId}
                onBranchChange={setSelectedBranchId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========== 營收總覽 ========== */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 page-title flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-600" />
          營收總覽
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 總營收 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">
                {getDateRangeLabel()}總營收
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(analytics.revenue.total)}
              </div>
              {dateRange !== 'all' && (
                <div className="flex items-center mt-2 text-sm">
                  {analytics.revenue.trend >= 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-green-600 font-semibold">
                        {formatPercentage(analytics.revenue.trend)}
                      </span>
                      <span className="text-muted ml-1">vs 上期</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-red-600 font-semibold">
                        {formatPercentage(analytics.revenue.trend)}
                      </span>
                      <span className="text-red-600 ml-1">vs 上期</span>
                    </>
                  )}
                </div>
              )}
              {dateRange === 'all' && (
                <p className="text-sm text-muted mt-2">
                  歷史累計所有已付款訂單
                </p>
              )}
            </CardContent>
          </Card>

          {/* 月營收 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">本月營收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(analytics.revenue.monthly)}
              </div>
              <p className="text-sm text-muted mt-2">
                當月累計收入
              </p>
            </CardContent>
          </Card>

          {/* 日均營收 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">日均營收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(analytics.revenue.daily)}
              </div>
              <p className="text-sm text-muted mt-2">
                {analytics.revenue.actualDays 
                  ? `過去${analytics.revenue.actualDays}天平均`
                  : '歷史平均'
                }
              </p>
            </CardContent>
          </Card>

          {/* 會員總儲值 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">會員總儲值</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {formatCurrency(analytics.members.totalBalance)}
              </div>
              <p className="text-sm text-muted mt-2">
                未消費餘額
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========== 營收細分 ========== */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 分店營收 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                分店營收排行
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.revenue.byBranch.slice(0, 5).map((branch, index) => (
                  <div key={branch.branchId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{branch.branchName}</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(branch.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 熱門服務 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                熱門服務項目
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.revenue.byService.slice(0, 5).map((service, index) => (
                  <div key={service.serviceId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{service.serviceName}</span>
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(service.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{service.count} 次預約</span>
                      <span>平均 {formatCurrency(Math.round(service.amount / service.count))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 付款方式 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                付款方式統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.revenue.byPaymentMethod.map((payment) => {
                  const total = analytics.revenue.byPaymentMethod.reduce((sum, p) => sum + p.amount, 0);
                  const percentage = ((payment.amount / total) * 100).toFixed(1);
                  
                  return (
                    <div key={payment.method} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{payment.method}</span>
                        <span className="text-sm font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{payment.count} 筆</span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========== 會員分析 ========== */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 page-title flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          會員分析
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 總會員數 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">總會員數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.members.total}</div>
              <p className="text-sm text-muted mt-2">註冊會員總數</p>
            </CardContent>
          </Card>

          {/* 本月新增 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">本月新增</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                +{analytics.members.newThisMonth}
              </div>
              <p className="text-sm text-muted mt-2">新註冊會員</p>
            </CardContent>
          </Card>

          {/* 活躍會員 */}
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">活躍會員</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {analytics.members.activeMembers}
              </div>
              <p className="text-sm text-muted mt-2">近30天有消費</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 會員等級分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                會員等級分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.members.byLevel.map((level) => {
                  const percentage = ((level.count / analytics.members.total) * 100).toFixed(1);
                  
                  return (
                    <div key={level.level} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{level.level || '未設定'}</span>
                        <span className="text-sm font-bold">{level.count} 人 ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 消費 TOP 10 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                消費 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.members.topSpenders.slice(0, 10).map((member, index) => (
                  <div key={member.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium truncate">{member.userName || '未設定姓名'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatCurrency(member.totalSpent)}
                      </div>
                      <div className="text-xs text-muted">
                        餘額 {formatCurrency(member.balance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========== 預約 & 刺青師績效 ========== */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 預約統計 */}
          <div>
            <h2 className="text-2xl font-bold mb-4 page-title flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              預約統計
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="stat-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted">總預約數</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.appointments.total}</div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted">轉換率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.appointments.conversionRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>預約狀態分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.appointments.byStatus.map((status) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      PENDING: { label: '待確認', color: 'bg-yellow-500' },
                      CONFIRMED: { label: '已確認', color: 'bg-blue-500' },
                      IN_PROGRESS: { label: '進行中', color: 'bg-purple-500' },
                      COMPLETED: { label: '已完成', color: 'bg-green-500' },
                      CANCELED: { label: '已取消', color: 'bg-red-500' }
                    };
                    
                    const config = statusConfig[status.status] || { label: status.status, color: 'bg-gray-500' };
                    const percentage = ((status.count / analytics.appointments.total) * 100).toFixed(1);
                    
                    return (
                      <div key={status.status} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${config.color}`} />
                            <span className="font-medium">{config.label}</span>
                          </div>
                          <span className="text-sm font-bold">{status.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`${config.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 刺青師績效 */}
          <div>
            <h2 className="text-2xl font-bold mb-4 page-title flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-orange-600" />
              刺青師績效
            </h2>
            
            <Card className="stat-card mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted">在職刺青師</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.artists.total}</div>
                <p className="text-sm text-muted mt-1">活躍刺青師數量</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>績效 TOP 5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.artists.topPerformers.slice(0, 5).map((artist, index) => (
                    <div key={artist.artistId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{artist.artistName}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm pl-9">
                        <div className="flex items-center gap-4">
                          <span className="text-muted">
                            <DollarSign className="h-3 w-3 inline mr-1" />
                            {formatCurrency(artist.revenue)}
                          </span>
                          <span className="text-muted">
                            <Package className="h-3 w-3 inline mr-1" />
                            {artist.completedServices} 次服務
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ========== 服務項目分析 ========== */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 page-title flex items-center gap-2">
          <Package className="h-6 w-6 text-indigo-600" />
          服務項目分析
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.services.topServices.map((service, index) => (
            <Card key={service.serviceId} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{service.serviceName}</CardTitle>
                  {index < 3 && (
                    <Award className={`h-5 w-5 ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      'text-orange-600'
                    }`} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">預約次數</span>
                    <span className="font-bold">{service.bookingCount} 次</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">完成率</span>
                    <span className="font-bold text-green-600">{service.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">總營收</span>
                    <span className="font-bold text-blue-600">{formatCurrency(service.revenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

