import type { ComponentProps } from "react"

import { DashboardOverviewMobile } from "./dashboard-overview-mobile"
import { DashboardOverviewResponsive } from "./dashboard-overview-responsive"

type DashboardOverviewProps = ComponentProps<typeof DashboardOverviewResponsive>

export function DashboardOverview(props: DashboardOverviewProps) {
  return (
    <>
      <div className="lg:hidden">
        <DashboardOverviewMobile {...props} />
      </div>
      <div className="hidden lg:block">
        <DashboardOverviewResponsive {...props} />
      </div>
    </>
  )
}
