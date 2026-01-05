import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface ControlsProps {
  loadImage: (file: File) => void;
  resultWidth?: number;
  setResultWidth: (v: number | undefined) => void;
  resultHeight?: number;
  setResultHeight: (v: number | undefined) => void;
  matchAspectRatio: boolean;
  setMatchAspectRatio: (b: boolean) => void;
  matchRatio: (newResultWidth?: number, newResultHeight?: number) => void;

  enableReduceColors: boolean;
  setEnableReduceColors: (b: boolean) => void;
  colorsCount?: number;
  setColorsCount: (n: number | undefined) => void;

  enableDithering: boolean;
  setEnableDithering: (b: boolean) => void;
  dithKern: string;
  setDithKern: (s: string) => void;
  dithDelta: number;
  setDithDelta: (n: number) => void;
}

export default function Controls({
  loadImage,
  resultWidth,
  setResultWidth,
  resultHeight,
  setResultHeight,
  matchAspectRatio,
  setMatchAspectRatio,
  matchRatio,
  enableReduceColors,
  setEnableReduceColors,
  colorsCount,
  setColorsCount,
  enableDithering,
  setEnableDithering,
  dithKern,
  setDithKern,
  dithDelta,
  setDithDelta,
}: Readonly<ControlsProps>) {
  return (
    <>
      <div className="border-2 border-black text-center mb-2">
        Общие настройки
      </div>
      <div className="flex flex-row items-center gap-4 w-full">
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadImage(file);
          }}
          className="flex-1 cursor-pointer border-black"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <Label className="justify-self-center">Ширина (px)</Label>
        <Input
          type="number"
          min={1}
          value={resultWidth ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setResultWidth(undefined);
              return;
            }
            const newWidth = parseInt(val);
            setResultWidth(newWidth);
            if (matchAspectRatio) matchRatio(newWidth);
          }}
          className="w-28 justify-self-center"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <Label className="justify-self-center">Высота (px)</Label>
        <Input
          type="number"
          min={1}
          value={resultHeight ?? ""}
          onChange={(e) =>
            setResultHeight(
              e.target.value === "" ? undefined : parseInt(e.target.value)
            )
          }
          disabled={matchAspectRatio}
          className={
            matchAspectRatio
              ? "w-28 bg-gray-200 cursor-not-allowed justify-self-center"
              : "w-28 justify-self-center"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2 items-center">
        <Label className="text-center">Сохранить соотношение сторон?</Label>
        <Checkbox
          id="matchAspectRatio"
          className="justify-self-center border-black"
          onCheckedChange={(checked) => {
            setMatchAspectRatio(!!checked);
            if (checked) matchRatio(resultWidth);
          }}
        />
      </div>

      <div className="border-2 border-black text-center mb-2">
        Настройка цвета
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2 items-center">
        <Label className="text-center">Уменьшить количество цветов?</Label>
        <Checkbox
          id="reduceColors"
          className="justify-self-center border-black"
          checked={enableReduceColors}
          onCheckedChange={(checked) => setEnableReduceColors(!!checked)}
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <Label className="justify-self-center">Количество цветов</Label>
        <Input
          type="number"
          min={0}
          disabled={!enableReduceColors}
          value={colorsCount ?? ""}
          onChange={(e) =>
            setColorsCount(
              e.target.value === "" ? undefined : parseInt(e.target.value)
            )
          }
          className="w-28 justify-self-center"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2 items-center">
        <Label className="justify-self-center">Добавить шум?</Label>
        <Checkbox
          id="addDithering"
          className="justify-self-center border-black"
          disabled={!enableReduceColors}
          checked={enableDithering}
          onCheckedChange={(checked) => setEnableDithering(!!checked)}
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <Label className="justify-self-center">Алгоритм шума</Label>
        <Select
          disabled={!enableDithering || !enableReduceColors}
          defaultValue={dithKern}
          onValueChange={(v) => setDithKern(v)}
        >
          <SelectTrigger className="min-w-40 justify-self-center">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">Никакой</SelectItem>
            <SelectItem value="FloydSteinberg">FloydSteinberg</SelectItem>
            <SelectItem value="FalseFloydSteinberg">
              FalseFloydSteinberg
            </SelectItem>
            <SelectItem value="Stucki">Stucki</SelectItem>
            <SelectItem value="Atkinson">Atkinson</SelectItem>
            <SelectItem value="Jarvis">Jarvis</SelectItem>
            <SelectItem value="Burkes">Burkes</SelectItem>
            <SelectItem value="Sierra">Sierra</SelectItem>
            <SelectItem value="TwoSierra">TwoSierra</SelectItem>
            <SelectItem value="SierraLite">SierraLite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <Label className="justify-self-center">Сила шума</Label>
        <div>
          <div className="text-center">{dithDelta.toFixed(2)}</div>
          <Slider
            value={[dithDelta]}
            disabled={!enableDithering || !enableReduceColors}
            onValueChange={([v]) => setDithDelta(v)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      </div>
    </>
  );
}
