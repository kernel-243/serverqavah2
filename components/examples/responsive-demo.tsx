import React from "react"
import { PageContainer, ResponsiveCard } from "@/components/ui/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/icons"

/**
 * Composant de démonstration des meilleures pratiques responsive
 * Utilisé comme référence pour les développeurs
 */
export const ResponsiveDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      
      {/* Hero Section Responsive */}
      <section className="py-4 sm:py-6 lg:py-8">
        <PageContainer maxWidth="4xl">
          <div className="text-center">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">
              Demo Responsive Design
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-2">
              Exemple d'implémentation des meilleures pratiques mobile-first avec Tailwind CSS et ShadCN UI.
            </p>
          </div>
        </PageContainer>
      </section>

      {/* Main Content */}
      <main className="pb-4 sm:pb-6 lg:pb-8">
        <PageContainer maxWidth="4xl">
          
          {/* Tabs Responsives */}
          <ResponsiveCard className="mb-4 sm:mb-6">
            <div className="p-1">
              <ScrollArea className="w-full">
                <div className="flex space-x-1 min-w-max">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Icons.home className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    <span className="hidden xs:inline">Accueil</span>
                    <span className="xs:hidden">Home</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Icons.user className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    <span>Profil</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Icons.settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    <span>Paramètres</span>
                  </Button>
                </div>
              </ScrollArea>
            </div>
          </ResponsiveCard>

          {/* Cards Grid Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            {[1, 2, 3].map((item) => (
              <ResponsiveCard key={item}>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icons.fileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                        Card {item}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Description courte
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                    <Badge className="text-xs px-2 py-0.5">
                      Status
                    </Badge>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      €{(item * 1000).toLocaleString()}
                    </span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full text-xs sm:text-sm"
                  >
                    <Icons.download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    <span className="hidden xs:inline">Télécharger</span>
                    <span className="xs:hidden">DL</span>
                  </Button>
                </div>
              </ResponsiveCard>
            ))}
          </div>

          {/* Liste Mobile-Optimisée */}
          <ResponsiveCard>
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Liste Responsive
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exemple de liste optimisée mobile
              </p>
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs sm:text-sm font-bold">{item}</span>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge 
                            className={`${
                              item % 2 === 0 ? "bg-purple-500" : "bg-emerald-500"
                            } text-white text-xs px-2 py-0.5`}
                          >
                            {item % 2 === 0 ? "Type A" : "Type B"}
                          </Badge>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            Item {item}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Icons.clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date().toLocaleDateString("fr-FR", { 
                              day: "numeric", 
                              month: "short", 
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-shrink-0 min-w-[70px] sm:min-w-[90px] text-xs px-2 sm:px-3"
                    >
                      <Icons.eye className="w-3 h-3 mr-1" />
                      <span className="hidden xs:inline">Voir</span>
                      <span className="xs:hidden">Voir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ResponsiveCard>

        </PageContainer>
      </main>

      {/* Footer Responsive */}
      <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 mt-4 sm:mt-6">
        <PageContainer maxWidth="4xl">
          <div className="py-3 sm:py-4 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Demo Responsive Design System
            </p>
          </div>
        </PageContainer>
      </footer>
    </div>
  )
}
