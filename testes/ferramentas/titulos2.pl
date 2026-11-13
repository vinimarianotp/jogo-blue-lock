#!/usr/bin/perl
# 2ª rodada dos títulos:
#  (a) converte também os títulos itálicos pesados com tamanho em clamp()/em (mínimo >= 16 px)
#  (b) aumenta 30% o tamanho de tudo que usa a fonte de display (a Jersey 10 desenha as letras
#      bem menores que a Inter no mesmo px). Marca o bloco com /* jersey */ para não aumentar 2 vezes.
use strict;
use warnings;
my $K = 1.3;
sub sc { my ($v) = @_; my $r = $v * $K; return ($r == int($r)) ? $r : sprintf('%.0f', $r); }
sub scale_vals {
  my ($s) = @_;
  $s =~ s/([\d.]+)px/sc($1).'px'/ge;
  $s =~ s/([\d.]+)vw/sprintf('%.2f', $1 * $K).'vw'/ge;
  $s =~ s/([\d.]+)vh/sprintf('%.2f', $1 * $K).'vh'/ge;
  return $s;
}
my $tot = 0;
for my $f (@ARGV) {
  local $/;
  open(my $in, '<', $f) or die $f;
  my $css = <$in>;
  close $in;
  my ($na, $nb) = (0, 0);
  $css =~ s{\{([^{}]*)\}}{
    my $b = $1;
    # (a) itálico pesado com clamp/em
    my $it = ($b =~ /font-style:\s*italic/ || $b =~ /font:\s*italic\b/);
    my $w = ($b =~ /font-weight:\s*(800|900)/ || $b =~ /font:\s*(?:italic\s+)?(?:800|900)\b/);
    if ($it && $w && $b !~ /--bl-font-display/) {
      my $min;
      if ($b =~ /font-size:\s*clamp\(\s*([\d.]+)px/) { $min = $1; }
      elsif ($b =~ /font:[^;]*clamp\(\s*([\d.]+)px/) { $min = $1; }
      elsif ($b =~ /font-size:\s*([\d.]+)(?:em|rem)/) { $min = $1 * 16; }
      if (defined $min && $min >= 16) {
        $na++;
        $b =~ s/font-style:\s*italic/font-style: normal/g;
        $b =~ s/font-weight:\s*(800|900)/font-weight: 400/g;
        $b =~ s/font:\s*italic\s+(?:800|900)\s+/font: 400 /g;
        $b =~ s/font:\s*(?:800|900)\s+/font: 400 /g;
        $b =~ s/(font:[^;]*?)var\(--bl-font-text\)/$1var(--bl-font-display)/g;
        $b =~ s/(font:[^;]*?)var\(--(?:sh|prf|col|tm|atr)-font\)/$1var(--bl-font-display)/g;
        if ($b =~ /font-family:/) { $b =~ s/font-family:\s*[^;]+/font-family: var(--bl-font-display)/g; }
        elsif ($b !~ /font:[^;]*--bl-font-display/) { $b =~ s/(\s*)$/\n  font-family: var(--bl-font-display);$1/; }
        $b =~ s/letter-spacing:\s*-[\d.]+(px|em)/letter-spacing: 0.02em/g;
      }
    }
    # (b) +30% em quem usa a fonte de display (uma vez só)
    if ($b =~ /--bl-font-display/ && $b !~ m{/\* jersey \*/}) {
      $nb++;
      $b =~ s/(font-size:\s*)([^;]+)/$1.scale_vals($2)/ge;
      $b =~ s/(font:\s*\d+\s+)([^;]*?)(\s*var\(--bl-font-display\))/$1.scale_vals($2).$3/ge;
      $b =~ s/(line-height:\s*)([\d.]+px)/$1.scale_vals($2)/ge;
      $b =~ s/^(\s*)/$1\/\* jersey \*\/ /;
    }
    "{$b}";
  }ge;
  open(my $out, '>', $f) or die $f;
  print $out $css;
  close $out;
  print "$f: convertidos(clamp/em)=$na aumentados=$nb\n";
  $tot += $na + $nb;
}
