import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  CreditCard, 
  History, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  Plus, 
  ArrowUpRight,
  TrendingUp,
  Package
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export const BillingDashboard: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBilling();
  }, [orgId]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/billing`, {
        credentials: "include",
      });
      setBilling(await res.json());
    } catch (err) {
      console.error("Failed to fetch billing data");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (amount: number) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/billing/topup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        fetchBilling();
      }
    } catch (err) {
      console.error("Purchase failed");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Billing...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-indigo-200 bg-indigo-50/30 rounded-3xl overflow-hidden shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                <Zap size={24} />
              </div>
              <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Active License
              </span>
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">{billing?.creditsRemaining}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Credits Remaining</div>
            <div className="mt-8 pt-6 border-t border-indigo-100 flex items-center justify-between">
              <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Tier: {billing?.licenseType}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires: {new Date(billing?.expiryDate).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">124</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumed This Month</div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
              <ArrowUpRight size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">+15% vs Last Month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <Package size={24} />
              </div>
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">$0.85</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Cost Per Session</div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-slate-400">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Pricing Active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <History className="text-indigo-600" size={20} />
            Transaction History
          </h3>
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                      <th className="px-8 py-4 border-b border-slate-100">Date</th>
                      <th className="px-8 py-4 border-b border-slate-100">Action</th>
                      <th className="px-8 py-4 border-b border-slate-100">Amount</th>
                      <th className="px-8 py-4 border-b border-slate-100">Credits</th>
                      <th className="px-8 py-4 border-b border-slate-100 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billing?.recentTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-slate-700">{new Date(tx.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                            {tx.creditsAdded > 0 ? "Credit Purchase" : "Session Consumption"}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-slate-700">${(tx.amount / 100).toFixed(2)}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={cn(
                            "text-xs font-black",
                            tx.creditsAdded > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {tx.creditsAdded > 0 ? `+${tx.creditsAdded}` : tx.creditsAdded}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Plus className="text-indigo-600" size={20} />
            Top Up Credits
          </h3>
          <div className="space-y-4">
            <PurchaseCard 
              amount={100} 
              price={99} 
              description="Standard Pack" 
              onPurchase={() => handlePurchase(100)} 
            />
            <PurchaseCard 
              amount={500} 
              price={449} 
              description="Professional Pack" 
              isPopular
              onPurchase={() => handlePurchase(500)} 
            />
            <PurchaseCard 
              amount={2000} 
              price={1599} 
              description="Enterprise Pack" 
              onPurchase={() => handlePurchase(2000)} 
            />
          </div>

          <Card className="border-amber-100 bg-amber-50/30 rounded-3xl overflow-hidden">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Auto-Refill</h4>
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  Enable auto-refill to automatically purchase 500 credits when your balance falls below 50.
                </p>
                <Button variant="ghost" className="h-6 p-0 text-[8px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700">
                  Configure Auto-Refill
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function PurchaseCard({ amount, price, description, isPopular, onPurchase }: { amount: number; price: number; description: string; isPopular?: boolean; onPurchase: () => void }) {
  return (
    <Card className={cn(
      "border-slate-200 rounded-3xl overflow-hidden transition-all hover:border-indigo-300 group",
      isPopular ? "border-indigo-200 shadow-md ring-2 ring-indigo-100" : ""
    )}>
      <CardContent className="p-6">
        {isPopular && (
          <div className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-2">Most Popular</div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-slate-900">{amount} Credits</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-slate-900">${price}</div>
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">One-time</div>
          </div>
        </div>
        <Button 
          onClick={onPurchase}
          className="w-full rounded-xl h-10 text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-indigo-600 transition-colors"
        >
          Purchase Pack
        </Button>
      </CardContent>
    </Card>
  );
}
