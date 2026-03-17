import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";
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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0, 0, 0.2, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

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

const faqs = [
  { q: "Is CollectWeb really free to start?", a: "Yes! The Starter plan is completely free with up to 50 customers and 100 invoices per month. No credit card required — you can upgrade anytime as your business grows." },
  { q: "How does offline mode work?", a: "CollectWeb stores data locally on your device so you can create invoices, record payments, and view customer details even without internet. Everything syncs automatically when you're back online." },
  { q: "Can I import my existing customer and invoice data?", a: "Absolutely. You can bulk import customers and invoices via CSV files. We also support AI-powered invoice scanning — just snap a photo and CollectWeb digitizes it for you." },
  { q: "How do role-based permissions work?", a: "You can invite team members as owners, managers, staff, collection staff, or delivery staff. Each role has specific permissions so everyone sees exactly what they need — nothing more." },
  { q: "Is my data secure?", a: "Yes. CollectWeb uses bank-grade encryption and row-level security policies. Your data is isolated per company, and only authorized team members can access it." },
  { q: "Can I switch plans later?", a: "Of course. You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logoImg} alt="CollectWeb logo" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover sm:h-9 sm:w-9" />
            <span className="text-lg font-bold tracking-tight sm:text-xl">CollectWeb</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-4">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-3 sm:px-6">
              <Link to="/signup">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5 sm:ml-1.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 md:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-accent/40 blur-3xl" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            Distributor Collection App — Mobile & Desktop
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            The Smartest Way to{" "}
            <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              Collect Payments
            </span>{" "}
            from Your Customers
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            CollectWeb is a powerful <strong>credit collection software</strong> built for distributors and wholesalers.
            Track invoices, manage credit limits, record payments, and monitor your team — all from one{" "}
            <strong>distributor payment tracking</strong> platform.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="rounded-full px-8 text-base">
              <Link to="/signup">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 text-base">
              <a href="#features">See Features</a>
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} custom={4} className="mt-4 text-sm text-muted-foreground">No credit card required · Free forever for small teams</motion.p>
        </motion.div>
      </section>

      {/* Trust strip */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={stagger}
        className="border-y border-border/50 bg-card/50 px-6 py-10"
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-muted-foreground">
          {[
            { icon: Shield, label: "Bank-Grade Security" },
            { icon: Clock, label: "Works Offline" },
            { icon: Bell, label: "Real-time Sync" },
            { icon: Smartphone, label: "Mobile Friendly" },
          ].map((item) => (
            <motion.span key={item.label} variants={fadeUp} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" /> {item.label}
            </motion.span>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need for <span className="text-primary">Invoice Collection</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
              A complete <strong>invoice collection system</strong> designed for distributors who want to get paid
              faster and manage credit smarter.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-border/60 bg-card p-7 transition-shadow hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card/50 px-6 py-20 md:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2"
        >
          <div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight md:text-4xl">Why Distributors Choose CollectWeb</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
              Purpose-built <strong>distributor collection app</strong> that fits the way you already work — no learning
              curve, instant results.
            </motion.p>
          </div>
          <ul className="space-y-4">
            {benefits.map((b, i) => (
              <motion.li key={b} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-base">{b}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight md:text-4xl">
              Simple, Transparent <span className="text-primary">Pricing</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
              Start free and scale as your business grows. No hidden fees, no surprises.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid gap-8 md:grid-cols-3"
          >
            {/* Free Plan */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-8"
            >
              <h3 className="text-lg font-semibold">Starter</h3>
              <p className="mt-1 text-sm text-muted-foreground">For small distributors getting started</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {["Up to 50 customers", "100 invoices/month", "1 team member", "Basic reports", "Mobile app access"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild className="mt-8 rounded-full">
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-lg"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold">Professional</h3>
              <p className="mt-1 text-sm text-muted-foreground">For growing distribution businesses</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold">₹999</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {["Unlimited customers", "Unlimited invoices", "Up to 10 team members", "Advanced reports & analytics", "AI invoice scanning", "Area-wise collection routes", "Priority support"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 rounded-full">
                <Link to="/signup">Start 14-Day Trial <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-8"
            >
              <h3 className="text-lg font-semibold">Enterprise</h3>
              <p className="mt-1 text-sm text-muted-foreground">For large-scale distributor networks</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold">₹2,499</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {["Everything in Professional", "Unlimited team members", "Custom roles & permissions", "Dedicated account manager", "API access & integrations", "Custom branding", "SLA guarantee"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild className="mt-8 rounded-full">
                <Link to="/signup">Contact Sales</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-card/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mb-12 text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked <span className="text-primary">Questions</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
              Everything you need to know about CollectWeb.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={fadeUp}
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl border border-border/60 bg-card px-5 data-[state=open]:border-primary/30 data-[state=open]:shadow-sm"
                >
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 md:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto max-w-3xl rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16"
        >
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
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t border-border/50 px-6 py-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logoImg} alt="CollectWeb" className="h-7 w-7 rounded-lg object-cover" />
                <span className="text-lg font-bold">CollectWeb</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The smartest distributor collection app to track invoices, manage credit, and get paid faster.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Contact & Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a href="mailto:support@collectweb.in" className="hover:text-foreground transition-colors">support@collectweb.in</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a href="tel:+919876543210" className="hover:text-foreground transition-colors">+91 98765 43210</a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                  <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">WhatsApp Support</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-border/50 pt-6 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} CollectWeb. All rights reserved.</p>
            <p>Made with ❤️ for Indian distributors</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
