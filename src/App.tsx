import { useForm } from "react-hook-form";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { v4 as uuidv4 } from 'uuid';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

const queryClient = new QueryClient();

const VECTOR_FIELDS = [
  { id: "VA", label: "Vibración en A (libre)" },
  { id: "VB", label: "Vibración en B (libre)" },
  { id: "WL", label: "Peso izquierdo (WL)" },
  { id: "VpA", label: "Vibración en A (Peso WL)" },
  { id: "VpB", label: "Vibración en B (Peso WL)" },
  { id: "WR", label: "Peso derecho (WR)" },
  { id: "VppA", label: "Vibración en A (Peso WR)" },
  { id: "VppB", label: "Vibración en B (Peso WR)" },
];

type FormData = {
  [key: string]: [number, number]; // [magnitude, angle_deg]
};

function vectorLineChart(vectors: { [key: string]: { real: number; imag: number } }, keys: string[], title: string) {
  const allValues = keys.flatMap(key => [vectors[key].real, vectors[key].imag]);
  const max = Math.max(...allValues.map(Math.abs)) * 1.2;
  return {
    data: {
      datasets: keys.map((key, index) => ({
        label: key,
        data: [
          { x: 0, y: 0 },
          { x: vectors[key].real, y: vectors[key].imag }
        ],
        borderColor: index === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0
      }))
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        title: {
          display: true,
          text: title
        },
        legend: {
          display: true
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: -max,
          max: max,
        },
        y: {
          type: 'linear' as const,
          min: -max,
          max: max,
        },
      }
    }
  };
}

function VectorRow({ register, errors, id, label }: { register: any; errors: any; id: string; label: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center flex-wrap gap-2 sm:gap-4">
          <div className="flex-auto  sm:flex-2">
            <label className="w-40 text-sm font-medium text-gray-700">{label}</label>
          </div>
          <div className=" flex-auto flex gap-4 sm:flex-3">
            <div className="flex-auto">
              <Input
                type="number"
                step="any"
                placeholder="Magnitud"
                className="w-full  min-w-32"
                {...register(`${id}.0`, {
                  required: true,
                  setValueAs: (v: string) => parseFloat(v),
                })}
              />
              {errors?.[id]?.[0] && <span className="text-red-500 text-xs mt-1">Este campo es requerido</span>}
            </div>
            <div className="flex-auto">
              <Input
                type="number"
                step="any"
                placeholder="Angulo (°)"
                className="w-full  min-w-32"
                {...register(`${id}.1`, { 
                  required: true,
                  setValueAs: (v: string) => parseFloat(v),
                })}
              />
              {errors?.[id]?.[1] && <span className="text-red-500 text-xs mt-1">Este campo es requerido</span>}
            </div>
          </div>
      </div>
    </div>
  );
}

function BalancingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("https://r7ikp43dq4.execute-api.us-east-1.amazonaws.com/dev/twoPlanesBalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to calculate");
      return res.json();
    },
  });

  const onSubmit = (data: FormData) => {console.log(data);mutation.mutate(data);}
  const chartKeyLeft = useMemo(() => uuidv4(), [mutation.data?.B_L]);
  const chartKeyRight = useMemo(() => uuidv4(), [mutation.data?.B_R]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full m-4 sm:max-w-xl sm:mx-auto p-6 bg-white shadow rounded-lg">
      <h2 className="text-xl font-semibold mb-6">Balanceo dinamico de dos planos</h2>
      {VECTOR_FIELDS.map(({ id, label }) => (
        <VectorRow key={id} id={id} label={label} register={register} errors={errors} />
      ))}
      <Button type="submit" className="mt-4 w-full">{mutation.isPending ? <FontAwesomeIcon spin icon={faSpinner} /> : "Calcular"}</Button>

      {mutation.data && (
        <div className="mt-6 text-sm text-gray-800 space-y-8">
          <div className="aspect-1/1 w-full">
            <p><strong>Balance izquierdo:</strong> Magnitud: {mutation.data.B_L.magnitude.toFixed(2)} | Angulo: {mutation.data.B_L.angle.toFixed(2)}°</p>
            <p><strong>Desbalance:</strong> Magnitud: {mutation.data.U_L.magnitude.toFixed(2)} | Angulo: {mutation.data.U_L.angle.toFixed(2)}°</p>
            <Line key={chartKeyLeft} id={`left-${chartKeyLeft}`} {...vectorLineChart(mutation.data, ['B_L', 'U_L'], 'Vectores del lado izquierdo')} />
          </div>
          <div>
            <p><strong>Balance derecho:</strong> Magnitud: {mutation.data.B_R.magnitude.toFixed(2)} | Angulo: {mutation.data.B_R.angle.toFixed(2)}°</p>
            <p><strong>Desbalance:</strong> Magnitud: {mutation.data.U_R.magnitude.toFixed(2)} | Angulo: {mutation.data.U_R.angle.toFixed(2)}°</p>
            <Line key={chartKeyRight} id={`right-${chartKeyRight}`} {...vectorLineChart(mutation.data, ['B_R', 'U_R'], 'Vectores del lado derecho')} />
          </div>
        </div>
      )}

      {mutation.error && <p className="mt-4 text-red-500 text-sm">Error: {mutation.error.message}</p>}
    </form>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <BalancingForm />
      </div>
    </QueryClientProvider>
  );
}
