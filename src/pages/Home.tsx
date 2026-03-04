import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Bell,
  TrendingUp,
  MapPin,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Invoice Collection System",
    description:
      "Create, scan, and track invoices effortlessly. Bulk import invoices or snap a photo — CollectWeb digitizes everything for you.",
  },
  {
    icon: CreditCard,
    title: "Credit Collection Software",
    description:
      "Monitor customer credit limits, outstanding balances, and overdue amounts in real time. Never lose track of receivables again.",
  },
  {
    icon: TrendingUp,
    title: "Distributor Payment Tracking",
    description:
      "Record payments by cash, cheque, or UPI. Link every payment to an invoice and watch balances update instantly.",
  },
  {
    icon: MapPin,
    title: "Area-Wise Collections",
    description:
      "Organize customers by area and assign collection routes to staff. Optimize fieldwork and reduce missed collections.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Invite owners, managers, and staff with role-based permissions. Everyone sees exactly what they need — nothing more.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Aging analysis, collection efficiency, and staff performance — all in beautiful dashboards updated in real time.",
  },
];

const benefits = [
  "Reduce overdue invoices by up to 40%",
  "Real-time sync across all devices",
  "Works offline — syncs when back online",
  "Bank-grade security with row-level access",
  "Bulk import customers & invoices via CSV",
  "AI-powered invoice scanning",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">CollectWeb</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full px-6">
              <Link to="/signup">
                Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 md:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-accent/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            Distributor Collection App — Mobile & Desktop
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            The Smartest Way to{" "}
            <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              Collect Payments
            </span>{" "}
            from Your Customers
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            CollectWeb is a powerful <strong>credit collection software</strong> built for distributors and wholesalers.
            Track invoices, manage credit limits, record payments, and monitor your team — all from one{" "}
            <strong>distributor payment tracking</strong> platform.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="rounded-full px-8 text-base">
              <Link to="/signup">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 text-base">
              <a href="#features">See Features</a>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">No credit card required · Free forever for small teams</p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border/50 bg-card/50 px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Bank-Grade Security
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Works Offline
          </span>
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Real-time Sync
          </span>
          <span className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /> Mobile Friendly
          </span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need for <span className="text-primary">Invoice Collection</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete <strong>invoice collection system</strong> designed for distributors who want to get paid
              faster and manage credit smarter.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/60 bg-card p-7 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card/50 px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why Distributors Choose CollectWeb</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built <strong>distributor collection app</strong> that fits the way you already work — no learning
              curve, instant results.
            </p>
          </div>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-base">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16">
          <h2 className="text-3xl font-bold md:text-4xl">Start Collecting Faster Today</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join hundreds of distributors who use CollectWeb to reduce overdue payments and streamline their{" "}
            <strong>distributor payment tracking</strong>.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild className="rounded-full px-8 text-base">
              <Link to="/signup">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="rounded-full px-8 text-base text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">CollectWeb</span> · Distributor Collection App
          </div>
          <p>© {new Date().getFullYear()} CollectWeb. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
