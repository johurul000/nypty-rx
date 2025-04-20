// app/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Separator } from '@/components/ui/separator';
import {
    LayoutDashboard, PackagePlus, Store, Receipt, BarChart3, Settings, // Desktop Icons
    Smartphone, Search, ShoppingBag, UploadCloud, MessageSquare, Zap // Mobile Icons + Generic 'Zap'
} from 'lucide-react';

// Define feature lists (kept for content)
const desktopFeatures = [
    // ... (same as before)
    { icon: LayoutDashboard, title: "Insightful Dashboard", description: "Key metrics at a glance: inventory status, sales, and notifications." },
    { icon: Store, title: "Easy Store Setup", description: "Input store details, address, contact info, and precise location with map integration." },
    { icon: PackagePlus, title: "Smart Medicine Management", description: "Search cloud master data with autofill, add batch numbers, quantity, and expiry dates." },
    { icon: Receipt, title: "Effortless Billing", description: "Generate local customer bills quickly, with real-time inventory updates." },
    { icon: BarChart3, title: "Actionable Reports", description: "Track sales trends, inventory movement, and billing history for better decisions." },
];

const androidFeatures = [
    // ... (same as before)
    { icon: Search, title: "Advanced Medicine Search", description: "Search nearby stores by typing, uploading a list, or even a prescription image." },
    { icon: ShoppingBag, title: "Optimized Store Finder", description: "Find the best store based on proximity and full/partial medicine availability." },
    { icon: Smartphone, title: "Instant Pickup Requests", description: "Request the nearest pharmacy to pack your order for quick collection." },
    { icon: UploadCloud, title: "Easy Prescription Upload", description: "Submit prescriptions directly to pharmacies near you." },
    { icon: MessageSquare, title: "Live Pharmacy Responses", description: "Get real-time availability confirmations and choose the fastest responding pharmacy." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background"> {/* Simpler background */}

      {/* --- Sticky Header --- */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center max-w-7xl mx-auto px-4 md:px-6"> {/* Contained width */}
          {/* Logo on Left */}
          <Link href="/" className="mr-6 flex items-center space-x-2" aria-label="Nypty Home">
             <Image
                src="/logo1.svg"
                alt="Nypty Logo"
                width={80} // Smaller logo for header
                height={25} // Adjust height
                priority
            />
            {/* Optional: Add text logo next to image if desired */}
            {/* <span className="font-bold">Nypty</span> */}
          </Link>

          {/* Spacer to push buttons right */}
          <div className="flex flex-1 items-center justify-end space-x-4">
            {/* Login/Signup Buttons on Right */}
            <nav className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">Pharmacy Login</Link>
                </Button>
                <Button asChild>
                    <Link href="/signup">Sign Up</Link>
                </Button>
                {/* You could add a mobile menu button here later */}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1"> {/* Main content wrapper */}
        {/* --- Minimalist Hero Section --- */}
        <section className="relative isolate overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
          {/* Subtle background gradient/shape */}
          <div
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#80caff] to-[#4f46e5] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="container mx-auto max-w-3xl px-4 md:px-6 text-center">
            {/* Tagline */}
            <div className="mb-4">
                 <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                     Connecting Pharmacies & Patients, Seamlessly.
                 </span>
             </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-tight">
              The Smart Link Between Your Pharmacy and Your Customers
            </h1>
            {/* Sub-headline */}
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Nypty empowers pharmacies with an intuitive CRM and connects customers through a dedicated app for effortless medicine access and communication.
            </p>
            {/* CTAs */}
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" asChild>
                  <Link href="/login">Get Started (Pharmacy)</Link>
              </Button>
              <Button size="lg" variant="outline" disabled>
                  Download App (Soon)
              </Button>
            </div>
          </div>

            {/* Subtle gradient fade at the bottom */}
            <div
                className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
                aria-hidden="true"
            >
                <div
                    className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#80ff89] to-[#4674e5] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
                    style={{
                    clipPath:
                        'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                />
            </div>
        </section>

        {/* --- Features Section --- */}
        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl mb-16">Everything You Need, Connected</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

              {/* Desktop App Features Card */}
              <div className="rounded-xl border bg-card text-card-foreground shadow p-6 md:p-8">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="bg-primary/10 p-3 rounded-lg">
                         <Store className="h-6 w-6 text-primary" />
                     </div>
                     <h3 className="text-2xl font-semibold">Nypty for Pharmacies <span className="text-xs text-muted-foreground ml-1">(Desktop)</span></h3>
                  </div>
                  <ul className="space-y-5">
                    {desktopFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-primary pt-1">
                           <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{feature.title}</h4>
                          <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button variant="link" className="px-0 mt-6" asChild>
                      <Link href="/login">Login to Pharmacy Portal →</Link>
                  </Button>
              </div>

              {/* Android App Features Card */}
              <div className="rounded-xl border bg-card text-card-foreground shadow p-6 md:p-8">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="bg-green-500/10 p-3 rounded-lg">
                         <Smartphone className="h-6 w-6 text-green-600" />
                     </div>
                     <h3 className="text-2xl font-semibold">Nypty for Customers <span className="text-xs text-muted-foreground ml-1">(App)</span></h3>
                  </div>
                  <ul className="space-y-5">
                    {androidFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-4">
                         <div className="flex-shrink-0 text-green-600 pt-1">
                           <feature.icon className="h-5 w-5" />
                        </div>
                         <div>
                          <h4 className="font-medium">{feature.title}</h4>
                          <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button variant="link" className="px-0 mt-6" disabled>
                       App Coming Soon →
                  </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Optional: Add other sections like Testimonials, Call to Action */}

      </main>

      {/* --- Footer --- */}
      <footer className="py-8 border-t mt-16">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nypty. All rights reserved.
        </div>
      </footer>
    </div>
  );
}