// app/dashboard/page.tsx
import { ArrowRight, PieChart, HeartPulse, Lightbulb, AlertTriangle, TrendingUp, Wallet, BarChart2 } from "lucide-react";

export default function AnalyticsDashboard() {
  const cards = [
    {
      title: "Cash Flow",
      description: "Track income and expenses over time",
      icon: <TrendingUp className="w-6 h-6" />,
      link: "analytics/cash-flow",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      iconColor: "text-blue-500"
    },
    {
      title: "Financial Health",
      description: "Key indicators of your business health",
      icon: <HeartPulse className="w-6 h-6" />,
      link: "analytics/financial-health",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-600",
      iconColor: "text-green-500"
    },
    {
      title: "Vendor Analysis",
      description: "Evaluate supplier performance",
      icon: <BarChart2 className="w-6 h-6" />,
      link: "analytics/vendor-analysis",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-600",
      iconColor: "text-orange-500"
    },
    {
      title: "Financial Optimization",
      description: "Maximize efficiency",
      icon: <Wallet className="w-6 h-6" />,
      link: "analytics/optimization",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
      textColor: "text-teal-600",
      iconColor: "text-teal-500"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Insights to drive your financial decisions</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => (
          <a
            key={index}
            href={card.link}
            className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all border ${card.bgColor} ${card.borderColor} hover:border-opacity-70`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${card.iconColor} ${card.bgColor.replace('50', '100')}`}>
                {card.icon}
              </div>
              <div>
                <h3 className={`font-semibold ${card.textColor}`}>{card.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{card.description}</p>
              </div>
              <ArrowRight className={`ml-auto w-5 h-5 ${card.textColor} opacity-70`} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
